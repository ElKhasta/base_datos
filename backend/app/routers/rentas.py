"""Rentas: proceso central del sistema.

Flujo:
    Solicitud (cliente)  ->  Solicitada
    Aprobacion (admin)   ->  Reservada / Activa  (aqui SI se aparta stock)
    Rechazo / cancelacion->  Cancelada

POST /api/rentas inserta la renta + todos sus detalles en UNA transaccion.
Si cualquier validacion falla, no se guarda absolutamente nada.
"""
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_db
from ..schemas import (
    AprobarSolicitud,
    CambioEstado,
    DevolucionCreate,
    RechazarSolicitud,
    RentaCreate,
)
from ..security import registrar_auditoria, requiere_admin, usuario_actual

router = APIRouter(prefix="/rentas", tags=["Rentas"])

SELECT_RENTA = """
SELECT r.id_renta, r.id_cliente, c.nombre_completo AS cliente, c.telefono,
       c.email AS cliente_email,
       r.id_estado, er.estado,
       r.fecha_registro, r.fecha_inicio, r.fecha_fin_estimada,
       r.monto_total,
       r.id_usuario_solicita, us.nombre AS solicitante,
       us.email AS solicitante_email,
       r.id_usuario_aprueba, ua.nombre AS aprobador,
       r.fecha_aprobacion, r.motivo_rechazo,
       COALESCE((SELECT SUM(p.monto_pagado) FROM pago p
                  WHERE p.id_renta = r.id_renta), 0) AS pagado,
       (SELECT COUNT(*) FROM detalle_renta d
         WHERE d.id_renta = r.id_renta AND d.fecha_devolucion IS NULL) AS lineas_pendientes
FROM renta r
JOIN cliente c       ON c.id_cliente = r.id_cliente
JOIN estado_renta er ON er.id_estado = r.id_estado
LEFT JOIN usuario us ON us.id_usuario = r.id_usuario_solicita
LEFT JOIN usuario ua ON ua.id_usuario = r.id_usuario_aprueba
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


def _verificar_visibilidad(renta: dict, usuario: dict) -> None:
    """Un cliente solo puede ver sus propias rentas. Se responde 404 para
    no revelar que existe una renta ajena."""
    if usuario["rol"] != "admin" and renta["id_cliente"] != usuario["id_cliente"]:
        raise HTTPException(404, "La renta no existe")


def _validar_stock(cur, detalles: list[tuple[int, int]]) -> None:
    """Bloquea los equipos y valida disponibilidad real.

    Se usa al crear una renta que SI aparta inventario (Reservada/Activa)
    y al aprobar una solicitud. El bloqueo FOR UPDATE evita que dos
    usuarios se queden con la ultima unidad al mismo tiempo.
    """
    for id_equipo, cantidad in detalles:
        cur.execute(
            "SELECT nombre FROM equipo WHERE id_equipo = %s FOR UPDATE",
            (id_equipo,),
        )
        equipo = cur.fetchone()
        if not equipo:
            raise HTTPException(404, f"El equipo {id_equipo} no existe")

        cur.execute(
            "SELECT disponible FROM v_equipo_disponible WHERE id_equipo = %s",
            (id_equipo,),
        )
        fila = cur.fetchone()
        disponible = fila["disponible"] if fila else 0

        if cantidad > disponible:
            raise HTTPException(
                409,
                f"Stock insuficiente de '{equipo['nombre']}': "
                f"se pidieron {cantidad} y solo hay {disponible} disponibles",
            )


def _bloquear_renta(cur, id_renta: int) -> dict:
    cur.execute(
        """SELECT r.id_renta, r.id_cliente, er.estado
             FROM renta r
             JOIN estado_renta er ON er.id_estado = r.id_estado
            WHERE r.id_renta = %s
              FOR UPDATE OF r""",
        (id_renta,),
    )
    renta = cur.fetchone()
    if not renta:
        raise HTTPException(404, "La renta no existe")
    return renta


def _detalles_cantidades(cur, id_renta: int) -> list[tuple[int, int]]:
    cur.execute(
        "SELECT id_equipo, cantidad FROM detalle_renta WHERE id_renta = %s ORDER BY id_equipo",
        (id_renta,),
    )
    return [(fila["id_equipo"], fila["cantidad"]) for fila in cur.fetchall()]


# ------------------------------------------------------------- lecturas
@router.get("")
def listar(
    estado: str | None = Query(default=None),
    id_cliente: int | None = Query(default=None),
    usuario: dict = Depends(usuario_actual),
    db=Depends(get_db),
):
    sql = SELECT_RENTA + " WHERE 1 = 1"
    params: list = []

    if usuario["rol"] != "admin":
        # El filtro de propiedad se aplica en el servidor, no en el front.
        sql += " AND r.id_cliente = %s"
        params.append(usuario["id_cliente"])
    elif id_cliente is not None:
        sql += " AND r.id_cliente = %s"
        params.append(id_cliente)

    if estado:
        sql += " AND er.estado = %s"
        params.append(estado)

    sql += " ORDER BY r.fecha_registro DESC"
    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@router.get("/pendientes/conteo")
def conteo_pendientes(admin=Depends(requiere_admin), db=Depends(get_db)):
    """Numero de solicitudes esperando aprobacion (badge del navbar)."""
    with db.cursor() as cur:
        cur.execute(
            """SELECT COUNT(*) AS pendientes
                 FROM renta r
                 JOIN estado_renta er ON er.id_estado = r.id_estado
                WHERE er.estado = 'Solicitada'"""
        )
        return cur.fetchone()


@router.get("/{id_renta}")
def obtener(
    id_renta: int,
    usuario: dict = Depends(usuario_actual),
    db=Depends(get_db),
):
    renta = _obtener_renta(db, id_renta)
    _verificar_visibilidad(renta, usuario)
    return renta


# ------------------------------------------------- PROCESO CENTRAL (POST)
@router.post("", status_code=201)
def crear(
    payload: RentaCreate,
    usuario: dict = Depends(usuario_actual),
    db=Depends(get_db),
):
    """Crea una renta o una solicitud.

    - Rol cliente: siempre nace como 'Solicitada', a nombre del cliente
      ligado a su cuenta y sin apartar inventario.
    - Rol admin: puede crearla como Solicitada, Reservada o Activa.
    """

    es_cliente = usuario["rol"] != "admin"
    if es_cliente:
        id_cliente = usuario["id_cliente"]
        if id_cliente is None:
            raise HTTPException(403, "Tu cuenta no está ligada a un cliente")
        estado = "Solicitada"
    else:
        id_cliente = payload.id_cliente
        estado = payload.estado

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
                (id_cliente,),
            )
            cliente = cur.fetchone()
            if not cliente:
                raise HTTPException(404, "El cliente no existe")
            if not cliente["estatus_activo"]:
                raise HTTPException(409, "El cliente esta dado de baja y no puede rentar")

            id_estado = _id_estado(cur, estado)

            # --- Cabecera de la renta (monto_total lo recalcula el trigger)
            cur.execute(
                """INSERT INTO renta (id_cliente, id_estado, fecha_inicio,
                                      fecha_fin_estimada, monto_total,
                                      id_usuario_solicita)
                   VALUES (%s, %s, %s, %s, 0, %s)
                   RETURNING id_renta""",
                (id_cliente, id_estado,
                 payload.fecha_inicio, payload.fecha_fin_estimada,
                 usuario["id_usuario"]),
            )
            id_renta = cur.fetchone()["id_renta"]

            # --- Detalles
            for id_equipo, cantidad in sorted(carrito.items()):
                cur.execute(
                    "SELECT nombre, precio_renta_diario FROM equipo WHERE id_equipo = %s FOR UPDATE",
                    (id_equipo,),
                )
                equipo = cur.fetchone()
                if not equipo:
                    raise HTTPException(404, f"El equipo {id_equipo} no existe")

                # Una solicitud NO aparta inventario: el admin revalida al aprobar.
                if estado != "Solicitada":
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

            registrar_auditoria(
                cur,
                usuario["id_usuario"],
                "solicitar_renta" if estado == "Solicitada" else "crear_renta",
                "renta",
                id_renta,
                f"{estado} · cliente #{id_cliente} · {len(carrito)} equipo(s)",
            )

    # 3. Se lee ya confirmado el commit, con totales y detalles
    return _obtener_renta(db, id_renta)


# ---------------------------------------------- aprobar / rechazar / cancelar
@router.post("/{id_renta}/aprobar")
def aprobar(
    id_renta: int,
    payload: AprobarSolicitud,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    """Aprueba una solicitud y revalida el inventario antes de apartarlo."""
    with db.transaction():
        with db.cursor() as cur:
            renta = _bloquear_renta(cur, id_renta)
            if renta["estado"] != "Solicitada":
                raise HTTPException(
                    409,
                    f"Solo se pueden aprobar solicitudes en estado 'Solicitada' "
                    f"(esta renta está '{renta['estado']}')",
                )

            # Revalidar stock justo ahora: entre la solicitud y la aprobacion
            # otra renta pudo haber ocupado las unidades.
            _validar_stock(cur, _detalles_cantidades(cur, id_renta))

            id_estado = _id_estado(cur, payload.estado)
            cur.execute(
                """UPDATE renta
                      SET id_estado = %s,
                          id_usuario_aprueba = %s,
                          fecha_aprobacion = CURRENT_TIMESTAMP,
                          motivo_rechazo = NULL
                    WHERE id_renta = %s""",
                (id_estado, admin["id_usuario"], id_renta),
            )
            registrar_auditoria(
                cur,
                admin["id_usuario"],
                "aprobar_solicitud",
                "renta",
                id_renta,
                f"Solicitud aprobada como {payload.estado}",
            )

    return _obtener_renta(db, id_renta)


@router.post("/{id_renta}/rechazar")
def rechazar(
    id_renta: int,
    payload: RechazarSolicitud,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    with db.transaction():
        with db.cursor() as cur:
            renta = _bloquear_renta(cur, id_renta)
            if renta["estado"] != "Solicitada":
                raise HTTPException(
                    409,
                    f"Solo se pueden rechazar solicitudes en estado 'Solicitada' "
                    f"(esta renta está '{renta['estado']}')",
                )

            id_cancelada = _id_estado(cur, "Cancelada")
            cur.execute(
                """UPDATE renta
                      SET id_estado = %s,
                          id_usuario_aprueba = %s,
                          fecha_aprobacion = CURRENT_TIMESTAMP,
                          motivo_rechazo = %s
                    WHERE id_renta = %s""",
                (id_cancelada, admin["id_usuario"], payload.motivo, id_renta),
            )
            registrar_auditoria(
                cur,
                admin["id_usuario"],
                "rechazar_solicitud",
                "renta",
                id_renta,
                payload.motivo,
            )

    return _obtener_renta(db, id_renta)


@router.post("/{id_renta}/cancelar")
def cancelar(
    id_renta: int,
    usuario: dict = Depends(usuario_actual),
    db=Depends(get_db),
):
    """El cliente cancela su solicitud; el admin puede cancelar cualquier
    renta que aun no haya terminado."""
    with db.transaction():
        with db.cursor() as cur:
            renta = _bloquear_renta(cur, id_renta)

            if usuario["rol"] == "admin":
                permitidos = {"Solicitada", "Reservada", "Activa"}
            else:
                _verificar_visibilidad(renta, usuario)
                permitidos = {"Solicitada"}

            if renta["estado"] not in permitidos:
                raise HTTPException(
                    409,
                    f"No se puede cancelar una renta en estado '{renta['estado']}'",
                )

            id_cancelada = _id_estado(cur, "Cancelada")
            cur.execute(
                """UPDATE renta
                      SET id_estado = %s,
                          motivo_rechazo = COALESCE(motivo_rechazo, 'Cancelada')
                    WHERE id_renta = %s""",
                (id_cancelada, id_renta),
            )
            registrar_auditoria(
                cur,
                usuario["id_usuario"],
                "cancelar_renta",
                "renta",
                id_renta,
                f"Cancelada por {usuario['rol']}",
            )

    return _obtener_renta(db, id_renta)


# ------------------------------------------------------- cambio de estado
@router.patch("/{id_renta}/estado")
def cambiar_estado(
    id_renta: int,
    payload: CambioEstado,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    with db.transaction():
        with db.cursor() as cur:
            renta = _bloquear_renta(cur, id_renta)

            if renta["estado"] == "Solicitada" and payload.estado in ("Reservada", "Activa"):
                raise HTTPException(
                    409,
                    "Esta renta es una solicitud: usa la acción Aprobar para revalidar el inventario",
                )

            if renta["estado"] != payload.estado:
                id_estado = _id_estado(cur, payload.estado)
                cur.execute(
                    "UPDATE renta SET id_estado = %s WHERE id_renta = %s",
                    (id_estado, id_renta),
                )
                registrar_auditoria(
                    cur,
                    admin["id_usuario"],
                    "cambiar_estado",
                    "renta",
                    id_renta,
                    f"{renta['estado']} → {payload.estado}",
                )

    return _obtener_renta(db, id_renta)


# ------------------------------------------------------------ devolucion
@router.post("/{id_renta}/devoluciones")
def registrar_devolucion(
    id_renta: int,
    payload: DevolucionCreate,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
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

            registrar_auditoria(
                cur,
                admin["id_usuario"],
                "registrar_devolucion",
                "renta",
                id_renta,
                f"Devolucion con fecha {fecha}",
            )

    return _obtener_renta(db, id_renta)


@router.delete("/{id_renta}")
def eliminar(
    id_renta: int,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    """Elimina la renta; sus detalles y pagos se borran en cascada."""
    with db.transaction():
        with db.cursor() as cur:
            registrar_auditoria(
                cur,
                admin["id_usuario"],
                "eliminar_renta",
                "renta",
                id_renta,
                "Renta eliminada definitivamente",
            )
            cur.execute("DELETE FROM renta WHERE id_renta = %s RETURNING id_renta", (id_renta,))
            fila = cur.fetchone()
            if not fila:
                raise HTTPException(404, "La renta no existe")
    return {"ok": True}
