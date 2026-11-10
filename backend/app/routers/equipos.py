"""Equipos: CRUD + consulta de disponibilidad real.

Lectura: cualquier usuario autenticado (el cliente necesita el catalogo).
Escritura: solo administradores.
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_db
from ..schemas import EquipoCreate, EquipoUpdate
from ..security import registrar_auditoria, requiere_admin, usuario_actual

router = APIRouter(prefix="/equipos", tags=["Equipos"])

SELECT_EQUIPO = """
SELECT e.id_equipo, e.nombre, e.marca, e.id_categoria, c.nombre_categoria,
       e.precio_renta_diario, e.stock,
       COALESCE(v.unidades_rentadas, 0) AS unidades_rentadas,
       COALESCE(v.disponible, e.stock)  AS disponible
FROM equipo e
JOIN categoria c ON c.id_categoria = e.id_categoria
LEFT JOIN v_equipo_disponible v ON v.id_equipo = e.id_equipo
"""


def _obtener_equipo(db, id_equipo: int) -> dict:
    with db.cursor() as cur:
        cur.execute(SELECT_EQUIPO + " WHERE e.id_equipo = %s", (id_equipo,))
        fila = cur.fetchone()
    if not fila:
        raise HTTPException(404, "El equipo no existe")
    return fila


@router.get("")
def listar(
    q: str | None = Query(default=None),
    id_categoria: int | None = Query(default=None),
    disponibles: bool | None = Query(default=None, description="Solo equipos con disponible > 0"),
    usuario: dict = Depends(usuario_actual),
    db=Depends(get_db),
):
    sql = SELECT_EQUIPO + " WHERE 1 = 1"
    params: list = []

    if q:
        sql += " AND (e.nombre ILIKE %s OR e.marca ILIKE %s)"
        like = f"%{q}%"
        params += [like, like]
    if id_categoria is not None:
        sql += " AND e.id_categoria = %s"
        params.append(id_categoria)
    if disponibles:
        sql += " AND COALESCE(v.disponible, e.stock) > 0"

    sql += " ORDER BY c.nombre_categoria, e.nombre"
    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@router.get("/{id_equipo}")
def obtener(
    id_equipo: int,
    usuario: dict = Depends(usuario_actual),
    db=Depends(get_db),
):
    return _obtener_equipo(db, id_equipo)


@router.post("", status_code=201)
def crear(
    payload: EquipoCreate,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    with db.transaction():
        with db.cursor() as cur:
            cur.execute(
                """INSERT INTO equipo (id_categoria, nombre, marca, precio_renta_diario, stock)
                   VALUES (%s, %s, %s, %s, %s)
                   RETURNING id_equipo""",
                (payload.id_categoria, payload.nombre, payload.marca,
                 payload.precio_renta_diario, payload.stock),
            )
            id_equipo = cur.fetchone()["id_equipo"]
            registrar_auditoria(
                cur, admin["id_usuario"], "crear_equipo", "equipo", id_equipo, payload.nombre
            )
    return _obtener_equipo(db, id_equipo)


@router.put("/{id_equipo}")
def actualizar(
    id_equipo: int,
    payload: EquipoUpdate,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    with db.transaction():
        with db.cursor() as cur:
            cur.execute(
                """UPDATE equipo
                      SET id_categoria = %s, nombre = %s, marca = %s,
                          precio_renta_diario = %s, stock = %s
                    WHERE id_equipo = %s
                    RETURNING id_equipo""",
                (payload.id_categoria, payload.nombre, payload.marca,
                 payload.precio_renta_diario, payload.stock, id_equipo),
            )
            fila = cur.fetchone()
            if not fila:
                raise HTTPException(404, "El equipo no existe")
            registrar_auditoria(
                cur, admin["id_usuario"], "actualizar_equipo", "equipo", id_equipo, payload.nombre
            )
    return _obtener_equipo(db, id_equipo)


@router.delete("/{id_equipo}")
def eliminar(
    id_equipo: int,
    admin: dict = Depends(requiere_admin),
    db=Depends(get_db),
):
    with db.transaction():
        with db.cursor() as cur:
            registrar_auditoria(
                cur, admin["id_usuario"], "eliminar_equipo", "equipo", id_equipo,
                "Equipo eliminado",
            )
            cur.execute("DELETE FROM equipo WHERE id_equipo = %s RETURNING id_equipo", (id_equipo,))
            fila = cur.fetchone()
            if not fila:
                raise HTTPException(404, "El equipo no existe")
    return {"ok": True}
