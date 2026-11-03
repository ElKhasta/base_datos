"""Clientes: CRUD con baja logica (estatus_activo = FALSE)."""
from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_db
from ..schemas import ClienteCreate, ClienteUpdate

router = APIRouter(prefix="/clientes", tags=["Clientes"])

CAMPOS = "id_cliente, nombre_completo, telefono, email, estatus_activo, fecha_alta"


@router.get("")
def listar(
    q: str | None = Query(default=None, description="Busca en nombre, telefono o email"),
    activos: bool | None = Query(default=None),
    db=Depends(get_db),
):
    sql = f"SELECT {CAMPOS} FROM cliente WHERE 1 = 1"
    params: list = []

    if q:
        sql += " AND (nombre_completo ILIKE %s OR telefono ILIKE %s OR email ILIKE %s)"
        like = f"%{q}%"
        params += [like, like, like]
    if activos is not None:
        sql += " AND estatus_activo = %s"
        params.append(activos)

    sql += " ORDER BY nombre_completo"
    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@router.get("/{id_cliente}")
def obtener(id_cliente: int, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute(f"SELECT {CAMPOS} FROM cliente WHERE id_cliente = %s", (id_cliente,))
        fila = cur.fetchone()
    if not fila:
        raise HTTPException(404, "El cliente no existe")
    return fila


@router.post("", status_code=201)
def crear(payload: ClienteCreate, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute(
            """INSERT INTO cliente (nombre_completo, telefono, email, estatus_activo)
               VALUES (%s, %s, %s, %s)
               RETURNING id_cliente, nombre_completo, telefono, email, estatus_activo, fecha_alta""",
            (payload.nombre_completo, payload.telefono, payload.email, payload.estatus_activo),
        )
        return cur.fetchone()


@router.put("/{id_cliente}")
def actualizar(id_cliente: int, payload: ClienteUpdate, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute(
            """UPDATE cliente
                  SET nombre_completo = %s, telefono = %s, email = %s, estatus_activo = %s
                WHERE id_cliente = %s
                RETURNING id_cliente, nombre_completo, telefono, email, estatus_activo, fecha_alta""",
            (payload.nombre_completo, payload.telefono, payload.email,
             payload.estatus_activo, id_cliente),
        )
        fila = cur.fetchone()
    if not fila:
        raise HTTPException(404, "El cliente no existe")
    return fila


@router.delete("/{id_cliente}")
def eliminar(id_cliente: int, db=Depends(get_db)):
    """Baja logica: el historial de rentas se conserva."""
    with db.cursor() as cur:
        cur.execute(
            "UPDATE cliente SET estatus_activo = FALSE WHERE id_cliente = %s RETURNING id_cliente",
            (id_cliente,),
        )
        fila = cur.fetchone()
    if not fila:
        raise HTTPException(404, "El cliente no existe")
    return {"ok": True, "mensaje": "Cliente dado de baja (el historial se conserva)"}
