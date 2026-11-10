"""Pagos: abonos o liquidacion de una renta. Solo administradores."""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db
from ..schemas import PagoCreate
from ..security import registrar_auditoria, requiere_admin

router = APIRouter(prefix="/rentas", tags=["Pagos"])


@router.get("/{id_renta}/pagos")
def listar(
    id_renta: int,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    with db.cursor() as cur:
        cur.execute("SELECT 1 FROM renta WHERE id_renta = %s", (id_renta,))
        if not cur.fetchone():
            raise HTTPException(404, "La renta no existe")

        cur.execute(
            """SELECT id_pago, id_renta, monto_pagado, fecha_pago, metodo_pago
                 FROM pago WHERE id_renta = %s ORDER BY id_pago""",
            (id_renta,),
        )
        return cur.fetchall()


@router.post("/{id_renta}/pagos", status_code=201)
def registrar(
    id_renta: int,
    payload: PagoCreate,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    with db.transaction():
        with db.cursor() as cur:
            # Bloquea la renta para que dos pagos simultaneos no se pasen del total.
            cur.execute(
                """SELECT r.monto_total, er.estado
                     FROM renta r
                     JOIN estado_renta er ON er.id_estado = r.id_estado
                    WHERE r.id_renta = %s
                      FOR UPDATE OF r""",
                (id_renta,),
            )
            renta = cur.fetchone()
            if not renta:
                raise HTTPException(404, "La renta no existe")
            if renta["estado"] == "Solicitada":
                raise HTTPException(
                    409, "No se puede cobrar una solicitud que aún no ha sido aprobada"
                )
            if renta["estado"] == "Cancelada":
                raise HTTPException(409, "No se puede cobrar una renta cancelada")

            cur.execute(
                "SELECT COALESCE(SUM(monto_pagado), 0) AS pagado FROM pago WHERE id_renta = %s",
                (id_renta,),
            )
            pagado = cur.fetchone()["pagado"]

            nuevo_total = Decimal(pagado) + Decimal(payload.monto_pagado)
            if nuevo_total > Decimal(renta["monto_total"]):
                restante = Decimal(renta["monto_total"]) - Decimal(pagado)
                raise HTTPException(
                    409,
                    f"El pago excede el total de la renta. Saldo pendiente: ${restante:.2f}",
                )

            cur.execute(
                """INSERT INTO pago (id_renta, monto_pagado, metodo_pago)
                   VALUES (%s, %s, %s)
                   RETURNING id_pago, id_renta, monto_pagado, fecha_pago, metodo_pago""",
                (id_renta, payload.monto_pagado, payload.metodo_pago),
            )
            pago = cur.fetchone()
            registrar_auditoria(
                cur,
                admin["id_usuario"],
                "registrar_pago",
                "pago",
                pago["id_pago"],
                f"Renta #{id_renta} · ${payload.monto_pagado} · {payload.metodo_pago}",
            )
            return pago
