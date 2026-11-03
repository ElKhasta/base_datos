"""Punto de entrada del backend.

Ejecutar desde la carpeta `backend`:

    uvicorn app.main:app --reload

Documentacion interactiva de la API:  http://localhost:8000/docs
Sitio (front):                        http://localhost:8000/
"""
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from psycopg import errors as pg_errors

from .config import CORS_ORIGINS, FRONTEND_DIR
from .db import get_db, pool
from .routers import categorias, clientes, equipos, pagos, rentas, reportes


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open()
    yield
    pool.close()


app = FastAPI(
    title="API - Renta de Equipos Audiovisuales",
    description="Sistema de renta de equipo audiovisual con PostgreSQL 18.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------
# Traduccion de errores de PostgreSQL a mensajes entendibles
# ---------------------------------------------------------------------
MENSAJES_POR_RESTRICCION = {
    "uq_equipo_nombre_marca": "Ya existe un equipo con ese nombre y marca",
    "uq_detalle_renta_equipo": "Ese equipo ya esta incluido en la renta",
    "cliente_email_key": "Ya existe un cliente registrado con ese correo",
    "categoria_nombre_categoria_key": "Ya existe una categoria con ese nombre",
    "estado_renta_estado_key": "Ese estado ya existe",
}


def _traducir(exc: Exception) -> str:
    restriccion = getattr(getattr(exc, "diag", None), "constraint_name", None) or ""

    if restriccion in MENSAJES_POR_RESTRICCION:
        return MENSAJES_POR_RESTRICCION[restriccion]

    if isinstance(exc, pg_errors.ForeignKeyViolation):
        return ("No se puede completar la operacion: el registro esta siendo usado "
                "por otros datos o la referencia indicada no existe")

    if isinstance(exc, pg_errors.CheckViolation):
        return "Los datos no cumplen una regla de validacion de la base de datos"

    if isinstance(exc, pg_errors.UniqueViolation):
        return "Ya existe un registro con ese valor"

    return "Conflicto con los datos enviados"


@app.exception_handler(pg_errors.CheckViolation)
async def _check_violation(request, exc):
    return JSONResponse(status_code=400, content={"detail": _traducir(exc)})


@app.exception_handler(pg_errors.RaiseException)
async def _raise_exception(request, exc):
    # Errores lanzados a proposito desde los triggers (RAISE EXCEPTION)
    return JSONResponse(status_code=400, content={"detail": str(exc).strip()})


@app.exception_handler(pg_errors.IntegrityError)
async def _integrity_error(request, exc):
    return JSONResponse(status_code=409, content={"detail": _traducir(exc)})


# ---------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------
app.include_router(categorias.router, prefix="/api")
app.include_router(clientes.router, prefix="/api")
app.include_router(equipos.router, prefix="/api")
app.include_router(rentas.router, prefix="/api")
app.include_router(pagos.router, prefix="/api")
app.include_router(reportes.router, prefix="/api")


@app.get("/api/salud", tags=["Sistema"])
def salud(db=Depends(get_db)):
    """Prueba de vida: confirma que el API y PostgreSQL responden."""
    with db.cursor() as cur:
        cur.execute("SELECT current_database() AS base, version() AS version")
        datos = cur.fetchone()
    return {"estado": "ok", **datos}


@app.get("/api/estados", tags=["Sistema"])
def estados(db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("SELECT id_estado, estado FROM estado_renta ORDER BY id_estado")
        return cur.fetchall()


# ---------------------------------------------------------------------
# El front se sirve desde el mismo servidor (sin problemas de CORS).
# Se monta AL FINAL para no tapar las rutas /api y /docs.
# ---------------------------------------------------------------------
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
