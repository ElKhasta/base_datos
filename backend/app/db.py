"""Capa de acceso a PostgreSQL: pool de conexiones + dependencia de FastAPI."""
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import DATABASE_URL

# Las filas se devuelven como diccionarios: {"id_renta": 1, ...}
pool = ConnectionPool(
    conninfo=DATABASE_URL,
    min_size=1,
    max_size=10,
    timeout=30,
    open=False,
    kwargs={"row_factory": dict_row},
)


def get_db():
    """Dependencia: entrega una conexion y la regresa al pool al terminar.

    Hace COMMIT al salir sin errores y ROLLBACK si el endpoint lanza excepcion.
    """
    with pool.connection() as conn:
        yield conn
