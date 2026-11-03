"""Rentas: proceso central del sistema.

POST /api/rentas  ->  inserta la renta + todos sus detalles en UNA transaccion.
Si cualquier validacion falla, no se guarda absolutamente nada.
"""
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_db
from ..schemas import CambioEstado, DevolucionCreate, RentaCreate

router = APIRouter(prefix="/rentas", tags=["Rentas"])

SELECT_RENTA = """
SELECT r.id_renta, r.id_cliente, c.nombre_completo AS cliente, c.telefono,
       r.id_estado, er.estado,
       r.fecha_registro, r.fecha_inicio, r.fecha_fin_estimada,
       r.monto_total,
       COALESCE((SELECT SUM(p.monto_pagado) FROM pago p
                  WHERE p.id_renta = r.id_renta), 0) AS pagado,
       (SELECT COUNT(*) FROM detalle_renta d
         WHERE d.id_renta = r.id_renta AND d.fecha_devolucion IS NULL) AS lineas_pendientes
FROM renta r
JOIN cliente c      ON c.id_cliente = r.id_cliente
JOIN estado_renta er ON er.id_estado = r.id_estado
"""


# ------------------------------------------------------------ helpers
def _obtener_renta(db, id_renta: int) -> dict:
    with db.cursor() as cur:
        cur.execute(SELECT_RENTA + " WHERE r.id_renta = %s", (id_renta,))
        renta = cur.fetchone()
        if not renta:
            raise HTTPException(404, "La renta no existe")

        cur.execute(
            """SELECT d.id_detalle, d.id_equipo, e.nombre AS equipo, e.marca,
                      d.cantidad, d.precio_unitario, d.subtotal, d.fecha_devolucion
                 FROM detalle_renta d
                 JOIN equipo e ON e.id_equipo = d.id_equipo
                WHERE d.id_renta = %s
                ORDER BY d.id_detalle""",
            (id_renta,),
        )
        renta["detalles"] = cur.fetchall()

        cur.execute(
            """SELECT id_pago, monto_pagado, fecha_pago, metodo_pago
                 FROM pago WHERE id_renta = %s ORDER BY id_pago""",
            (id_renta,),
        )
        renta["pagos"] = cur.fetchall()

    return renta


def _id_estado(cur, nombre: str) -> int:
    cur.execute("SELECT id_estado FROM estado_renta WHERE estado = %s", (nombre,))
    fila = cur.fetchone()
    if not fila:
        raise HTTPException(500, f"El estado '{nombre}' no existe en el catalogo")
    return fila["id_estado"]


# ------------------------------------------------------------- lecturas
@router.get("")
def listar(
    estado: str | None = Query(default=None),
    id_cliente: int | None = Query(default=None),
    db=Depends(get_db),
):
    sql = SELECT_RENTA + " WHERE 1 = 1"
    params: list = []

    if estado:
        sql += " AND er.estado = %s"
        params.append(estado)
    if id_cliente is not None:
        sql += " AND r.id_cliente = %s"
        params.append(id_cliente)

    sql += " ORDER BY r.fecha_registro DESC"
    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@router.get("/{id_renta}")
def obtener(id_renta: int, db=Depends(get_db)):
    return _obtener_renta(db, id_renta)


# ------------------------------------------------- PROCESO CENTRAL (POST)
@router.post("", status_code=201)
def crear(payload: RentaCreate, db=Depends(get_db)):
    """Crea una renta completa: valida stock, calcula montos y guarda todo
    dentro de una sola transaccion."""

    # 1. Consolidar el carrito (si el front manda el mismo equipo 2 veces)
    carrito: dict[int, int] = {}
    for item in payload.detalles:
        carrito[item.id_equipo] = carrito.get(item.id_equipo, 0) + item.cantidad

    # 2. Dias de renta (minimo 1)
    dias = max((payload.fecha_fin_estimada - payload.fecha_inicio).days, 1)

    with db.transaction():
        with db.cursor() as cur:
            # --- Cliente valido y activo
            cur.execute(
                "SELECT nombre_completo, estatus_activo FROM cliente WHERE id_cliente = %s",
                (payload.id_cliente,),
            )
            cliente = cur.fetchone()
            if not cliente:
                raise HTTPException(404, "El cliente no existe")
            if not cliente["estatus_activo"]:
                raise HTTPException(409, "El cliente esta dado de baja y no puede rentar")

            id_estado = _id_estado(cur, payload.estado)

            # --- Cabecera de la renta (monto_total lo recalcula el trigger)
            cur.execute(
                """INSERT INTO renta (id_cliente, id_estado, fecha_inicio,
                                      fecha_fin_estimada, monto_total)
                   VALUES (%s, %s, %s, %s, 0)
                   RETURNING id_renta""",
                (payload.id_cliente, id_estado,
                 payload.fecha_inicio, payload.fecha_fin_estimada),
            )
            id_renta = cur.fetchone()["id_renta"]

            # --- Detalles
            for id_equipo, cantidad in sorted(carrito.items()):
                # Bloquea la fila del equipo: evita que dos usuarios renten
                # la ultima unidad al mismo tiempo.
                cur.execute(
                    "SELECT nombre, precio_renta_diario FROM equipo WHERE id_equipo = %s FOR UPDATE",
                    (id_equipo,),
                )
                equipo = cur.fetchone()
                if not equipo:
                    raise HTTPException(404, f"El equipo {id_equipo} no existe")

                cur.execute(
                    "SELECT disponible FROM v_equipo_disponible WHERE id_equipo = %s",
                    (id_equipo,),
                )
                disponible = cur.fetchone()["disponible"]

                if cantidad > disponible:
                    raise HTTPException(
                        409,
                        f"Stock insuficiente de '{equipo['nombre']}': "
                        f"se pidieron {cantidad} y solo hay {disponible} disponibles",
                    )

                precio = equipo["precio_renta_diario"]
                subtotal = (Decimal(cantidad) * precio * Decimal(dias)).quantize(Decimal("0.01"))

                cur.execute(
                    """INSERT INTO detalle_renta
                           (id_renta, id_equipo, cantidad, precio_unitario, subtotal)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (id_renta, id_equipo, cantidad, precio, subtotal),
                )

    # 3. Se lee ya confirmado el commit, con totales y detalles
    return _obtener_renta(db, id_renta)


# ------------------------------------------------------- cambio de estado
@router.patch("/{id_renta}/estado")
def cambiar_estado(id_renta: int, payload: CambioEstado, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("SELECT id_renta FROM renta WHERE id_renta = %s", (id_renta,))
        if not cur.fetchone():
            raise HTTPException(404, "La renta no existe")

        id_estado = _id_estado(cur, payload.estado)
        cur.execute(
            "UPDATE renta SET id_estado = %s WHERE id_renta = %s",
            (id_estado, id_renta),
        )
    return _obtener_renta(db, id_renta)


# ------------------------------------------------------------ devolucion
@router.post("/{id_renta}/devoluciones")
def registrar_devolucion(id_renta: int, payload: DevolucionCreate, db=Depends(get_db)):
    """Registra la fecha de devolucion de una o varias lineas.

    - Sin id_detalles: devuelve todas las lineas pendientes.
    - Si ya no queda ninguna pendiente, la renta pasa a 'Finalizada'.
    """
    fecha = payload.fecha_devolucion or date.today()

    with db.transaction():
        with db.cursor() as cur:
            cur.execute("SELECT id_renta FROM renta WHERE id_renta = %s", (id_renta,))
            if not cur.fetchone():
                raise HTTPException(404, "La renta no existe")

            if payload.id_detalles:
                cur.execute(
                    """UPDATE detalle_renta
                          SET fecha_devolucion = %s
                        WHERE id_renta = %s
                          AND id_detalle = ANY(%s)
                          AND fecha_devolucion IS NULL""",
                    (fecha, id_renta, payload.id_detalles),
                )
            else:
                cur.execute(
                    """UPDATE detalle_renta
                          SET fecha_devolucion = %s
                        WHERE id_renta = %s AND fecha_devolucion IS NULL""",
                    (fecha, id_renta),
                )

            if cur.rowcount == 0:
                raise HTTPException(409, "No hay lineas pendientes de devolucion en esta renta")

            cur.execute(
                """SELECT COUNT(*) AS pendientes FROM detalle_renta
                    WHERE id_renta = %s AND fecha_devolucion IS NULL""",
                (id_renta,),
            )
            if cur.fetchone()["pendientes"] == 0:
                id_finalizada = _id_estado(cur, "Finalizada")
                cur.execute(
                    "UPDATE renta SET id_estado = %s WHERE id_renta = %s",
                    (id_finalizada, id_renta),
                )

    return _obtener_renta(db, id_renta)


@router.delete("/{id_renta}")
def eliminar(id_renta: int, db=Depends(get_db)):
    """Elimina la renta; sus detalles y pagos se borran en cascada."""
    with db.cursor() as cur:
        cur.execute("DELETE FROM renta WHERE id_renta = %s RETURNING id_renta", (id_renta,))
        fila = cur.fetchone()
    if not fila:
        raise HTTPException(404, "La renta no existe")
    return {"ok": True}
