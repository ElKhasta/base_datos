"""Clientes: CRUD con baja logica y gestion de su acceso al portal.

El cliente (entidad de negocio) es distinto del usuario (cuenta para
iniciar sesion). Un cliente puede existir sin cuenta; el admin se la
crea o se la revoca desde aqui.
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_db
from ..schemas import AccesoCliente, ClienteCreate, ClienteUpdate
from ..security import hash_password, registrar_auditoria, requiere_admin

router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"],
    dependencies=[Depends(requiere_admin)],
)

CAMPOS = """
SELECT c.id_cliente, c.nombre_completo, c.telefono, c.email,
       c.estatus_activo, c.fecha_alta,
       (u.id_usuario IS NOT NULL) AS tiene_acceso,
       u.email AS email_acceso,
       u.activo AS acceso_activo
  FROM cliente c
  LEFT JOIN usuario u ON u.id_cliente = c.id_cliente
"""


@router.get("")
def listar(
    q: str | None = Query(default=None, description="Busca en nombre, telefono o email"),
    activos: bool | None = Query(default=None),
    db=Depends(get_db),
):
    sql = CAMPOS + " WHERE 1 = 1"
    params: list = []

    if q:
        sql += " AND (c.nombre_completo ILIKE %s OR c.telefono ILIKE %s OR c.email ILIKE %s)"
        like = f"%{q}%"
        params += [like, like, like]
    if activos is not None:
        sql += " AND c.estatus_activo = %s"
        params.append(activos)

    sql += " ORDER BY c.nombre_completo"
    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@router.get("/{id_cliente}")
def obtener(id_cliente: int, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute(CAMPOS + " WHERE c.id_cliente = %s", (id_cliente,))
        fila = cur.fetchone()
    if not fila:
        raise HTTPException(404, "El cliente no existe")
    return fila


@router.post("", status_code=201)
def crear(payload: ClienteCreate, admin: dict = Depends(requiere_admin), db=Depends(get_db)):
    with db.transaction():
        with db.cursor() as cur:
            cur.execute(
                """INSERT INTO cliente (nombre_completo, telefono, email, estatus_activo)
                   VALUES (%s, %s, %s, %s)
                   RETURNING id_cliente""",
                (payload.nombre_completo, payload.telefono, payload.email, payload.estatus_activo),
            )
            id_cliente = cur.fetchone()["id_cliente"]
            registrar_auditoria(
                cur,
                admin["id_usuario"],
                "crear_cliente",
                "cliente",
                id_cliente,
                payload.nombre_completo,
            )
    return obtener(id_cliente, db)


@router.put("/{id_cliente}")
def actualizar(
    id_cliente: int,
    payload: ClienteUpdate,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    with db.transaction():
        with db.cursor() as cur:
            cur.execute(
                """UPDATE cliente
                      SET nombre_completo = %s, telefono = %s, email = %s, estatus_activo = %s
                    WHERE id_cliente = %s
                    RETURNING id_cliente""",
                (payload.nombre_completo, payload.telefono, payload.email,
                 payload.estatus_activo, id_cliente),
            )
            fila = cur.fetchone()
            if not fila:
                raise HTTPException(404, "El cliente no existe")
            registrar_auditoria(
                cur,
                admin["id_usuario"],
                "actualizar_cliente",
                "cliente",
                id_cliente,
                payload.nombre_completo,
            )
    return obtener(id_cliente, db)


@router.delete("/{id_cliente}")
def eliminar(
    id_cliente: int,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    """Baja logica: el historial de rentas se conserva y la cuenta se bloquea."""
    with db.transaction():
        with db.cursor() as cur:
            cur.execute(
                "UPDATE cliente SET estatus_activo = FALSE WHERE id_cliente = %s RETURNING id_cliente",
                (id_cliente,),
            )
            fila = cur.fetchone()
            if not fila:
                raise HTTPException(404, "El cliente no existe")

            cur.execute(
                "UPDATE usuario SET activo = FALSE WHERE id_cliente = %s",
                (id_cliente,),
            )
            registrar_auditoria(
                cur,
                admin["id_usuario"],
                "baja_cliente",
                "cliente",
                id_cliente,
                "Baja logica; acceso al portal bloqueado",
            )
    return {"ok": True, "mensaje": "Cliente dado de baja (el historial se conserva)"}


# --------------------------------------------------------- acceso al portal
@router.post("/{id_cliente}/acceso")
def otorgar_acceso(
    id_cliente: int,
    payload: AccesoCliente,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    """Crea la cuenta de un cliente existente o reactiva/actualiza la suya."""
    email = str(payload.email).lower()

    with db.transaction():
        with db.cursor() as cur:
            cur.execute(
                "SELECT nombre_completo, estatus_activo FROM cliente WHERE id_cliente = %s",
                (id_cliente,),
            )
            cliente = cur.fetchone()
            if not cliente:
                raise HTTPException(404, "El cliente no existe")
            if not cliente["estatus_activo"]:
                raise HTTPException(409, "El cliente esta dado de baja; reactívalo antes de darle acceso")

            cur.execute(
                "SELECT id_usuario FROM usuario WHERE id_cliente = %s",
                (id_cliente,),
            )
            cuenta = cur.fetchone()

            # El correo de acceso no puede pertenecer a otra cuenta.
            cur.execute(
                """SELECT id_usuario FROM usuario
                    WHERE lower(email) = lower(%s)
                      AND id_cliente IS DISTINCT FROM %s""",
                (email, id_cliente),
            )
            if cur.fetchone():
                raise HTTPException(409, "Ese correo ya está asociado a otra cuenta")

            nombre = payload.nombre or cliente["nombre_completo"]

            if cuenta:
                cur.execute(
                    """UPDATE usuario
                          SET email = %s, password_hash = %s, nombre = %s, activo = TRUE
                        WHERE id_usuario = %s""",
                    (email, hash_password(payload.password), nombre, cuenta["id_usuario"]),
                )
                accion = "reactivar_acceso"
            else:
                cur.execute(
                    """INSERT INTO usuario (email, password_hash, nombre, id_rol, id_cliente)
                       VALUES (%s, %s, %s,
                               (SELECT id_rol FROM rol WHERE nombre = 'cliente'), %s)
                       RETURNING id_usuario""",
                    (email, hash_password(payload.password), nombre, id_cliente),
                )
                cuenta = cur.fetchone()
                accion = "crear_acceso"

            registrar_auditoria(
                cur,
                admin["id_usuario"],
                accion,
                "usuario",
                cuenta["id_usuario"],
                f"Acceso del cliente #{id_cliente} ({email})",
            )

    return {"ok": True, "id_usuario": cuenta["id_usuario"], "email": email, "nombre": nombre}


@router.delete("/{id_cliente}/acceso")
def revocar_acceso(
    id_cliente: int,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    """Desactiva la cuenta sin borrarla (conserva la trazabilidad)."""
    with db.transaction():
        with db.cursor() as cur:
            cur.execute(
                "UPDATE usuario SET activo = FALSE WHERE id_cliente = %s RETURNING id_usuario",
                (id_cliente,),
            )
            fila = cur.fetchone()
            if not fila:
                raise HTTPException(404, "Ese cliente no tiene una cuenta de acceso")

            registrar_auditoria(
                cur,
                admin["id_usuario"],
                "revocar_acceso",
                "usuario",
                fila["id_usuario"],
                f"Acceso del cliente #{id_cliente} desactivado",
            )

    return {"ok": True, "mensaje": "Acceso revocado"}
