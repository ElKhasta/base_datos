"""Categorias: CRUD simple."""
from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db
from ..schemas import CategoriaCreate

router = APIRouter(prefix="/categorias", tags=["Categorias"])


@router.get("")
def listar(db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("SELECT id_categoria, nombre_categoria, descripcion FROM categoria ORDER BY nombre_categoria")
        return cur.fetchall()


@router.get("/{id_categoria}")
def obtener(id_categoria: int, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute(
            "SELECT id_categoria, nombre_categoria, descripcion FROM categoria WHERE id_categoria = %s",
            (id_categoria,),
        )
        fila = cur.fetchone()
    if not fila:
        raise HTTPException(404, "La categoria no existe")
    return fila


@router.post("", status_code=201)
def crear(payload: CategoriaCreate, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute(
            """INSERT INTO categoria (nombre_categoria, descripcion)
               VALUES (%s, %s)
               RETURNING id_categoria, nombre_categoria, descripcion""",
            (payload.nombre_categoria, payload.descripcion),
        )
        return cur.fetchone()


@router.put("/{id_categoria}")
def actualizar(id_categoria: int, payload: CategoriaCreate, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute(
            """UPDATE categoria SET nombre_categoria = %s, descripcion = %s
                WHERE id_categoria = %s
                RETURNING id_categoria, nombre_categoria, descripcion""",
            (payload.nombre_categoria, payload.descripcion, id_categoria),
        )
        fila = cur.fetchone()
    if not fila:
        raise HTTPException(404, "La categoria no existe")
    return fila


@router.delete("/{id_categoria}")
def eliminar(id_categoria: int, db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("DELETE FROM categoria WHERE id_categoria = %s RETURNING id_categoria", (id_categoria,))
        fila = cur.fetchone()
    if not fila:
        raise HTTPException(404, "La categoria no existe")
    return {"ok": True}
