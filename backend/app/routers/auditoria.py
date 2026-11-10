"""Bitacora de auditoria: solo administradores."""
from fastapi import APIRouter, Depends, Query

from ..db import get_db
from ..security import requiere_admin

router = APIRouter(
    prefix="/auditoria",
    tags=["Auditoria"],
    dependencies=[Depends(requiere_admin)],
)

SELECT_AUDITORIA = """
SELECT a.id_auditoria, a.fecha, a.accion, a.entidad, a.id_entidad, a.detalle,
       a.id_usuario, u.nombre AS usuario, u.email AS usuario_email,
       r.nombre AS rol
  FROM auditoria a
  LEFT JOIN usuario u ON u.id_usuario = a.id_usuario
  LEFT JOIN rol r     ON r.id_rol = u.id_rol
 WHERE 1 = 1
"""


@router.get("")
def listar(
    accion: str | None = Query(default=None),
    entidad: str | None = Query(default=None),
    limite: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db=Depends(get_db),
):
    filtros = ""
    params: list = []

    if accion:
        filtros += " AND a.accion = %s"
        params.append(accion)
    if entidad:
        filtros += " AND a.entidad = %s"
        params.append(entidad)

    sql = (
        SELECT_AUDITORIA
        + filtros
        + " ORDER BY a.fecha DESC, a.id_auditoria DESC LIMIT %s OFFSET %s"
    )

    with db.cursor() as cur:
        cur.execute(sql, params + [limite, offset])
        filas = cur.fetchall()

        # El total debe respetar los mismos filtros; si no, el front dice
        # "2 de 31 eventos" al filtrar y la paginacion no cuadra.
        cur.execute(f"SELECT COUNT(*) AS total FROM auditoria a WHERE 1 = 1{filtros}", params)
        total = cur.fetchone()["total"]

    return {"total": total, "resultados": filas}


@router.get("/acciones")
def acciones(db=Depends(get_db)):
    """Lista de acciones registradas, para llenar el filtro del front."""
    with db.cursor() as cur:
        cur.execute("SELECT DISTINCT accion FROM auditoria ORDER BY accion")
        return [fila["accion"] for fila in cur.fetchall()]
