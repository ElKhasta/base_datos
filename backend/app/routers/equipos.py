"""Equipos: CRUD + consulta de disponibilidad real."""
from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_db
from ..schemas import EquipoCreate, EquipoUpdate

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


@router.get("")
def listar(
    q: str | None = Query(default=None),
    id_categoria: int | None = Query(default=None),
    disponibles: bool | None = Query(default=None, description="Solo equipos con disponible > 0"),
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
def obtener(id_equipo: int, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute(SELECT_EQUIPO + " WHERE e.id_equipo = %s", (id_equipo,))
        fila = cur.fetchone()
    if not fila:
        raise HTTPException(404, "El equipo no existe")
    return fila


@router.post("", status_code=201)
def crear(payload: EquipoCreate, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute(
            """INSERT INTO equipo (id_categoria, nombre, marca, precio_renta_diario, stock)
               VALUES (%s, %s, %s, %s, %s)
               RETURNING id_equipo""",
            (payload.id_categoria, payload.nombre, payload.marca,
             payload.precio_renta_diario, payload.stock),
        )
        id_equipo = cur.fetchone()["id_equipo"]
    return obtener(id_equipo, db)


@router.put("/{id_equipo}")
def actualizar(id_equipo: int, payload: EquipoUpdate, db=Depends(get_db)):
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
    return obtener(id_equipo, db)


@router.delete("/{id_equipo}")
def eliminar(id_equipo: int, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("DELETE FROM equipo WHERE id_equipo = %s RETURNING id_equipo", (id_equipo,))
        fila = cur.fetchone()
    if not fila:
        raise HTTPException(404, "El equipo no existe")
    return {"ok": True}
