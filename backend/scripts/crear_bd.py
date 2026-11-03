"""Crea la base de datos y carga el esquema + datos de prueba.

Uso (desde la carpeta backend, con el venv activo):

    python scripts/crear_bd.py

Pide la contrasena del usuario de PostgreSQL y, al terminar, escribe el
archivo backend/.env para que la API se conecte sin configuracion extra.

Tambien se puede automatizar con variables de entorno:

    $env:PGPASSWORD="tu_clave"; python scripts/crear_bd.py
"""
import getpass
import os
import sys
from pathlib import Path
from urllib.parse import quote_plus

import psycopg
from psycopg import sql

# La consola de Windows puede no soportar acentos
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

RAIZ = Path(__file__).resolve().parents[2]
DIR_SQL = RAIZ / "sql"
RUTA_ENV = RAIZ / "backend" / ".env"

HOST = os.getenv("PGHOST", "localhost")
PUERTO = os.getenv("PGPORT", "5432")
USUARIO = os.getenv("PGUSER", "postgres")
BASE = os.getenv("PGDATABASE", "renta_equipos")


def ejecutar_archivo(conn: psycopg.Connection, ruta: Path) -> None:
    print(f"  -> {ruta.name} ... ", end="", flush=True)
    with conn.cursor() as cur:
        cur.execute(ruta.read_text(encoding="utf-8"))
    print("OK")


def main() -> int:
    clave = os.getenv("PGPASSWORD")
    if not clave:
        print(f"Conectando como '{USUARIO}' a {HOST}:{PUERTO}")
        clave = getpass.getpass("Contrasena de PostgreSQL: ")

    # 1. Conexion a la base administrativa "postgres"
    try:
        admin = psycopg.connect(
            host=HOST, port=PUERTO, user=USUARIO, password=clave,
            dbname="postgres", autocommit=True, connect_timeout=10,
        )
    except Exception as e:
        print(f"\n[ERROR] No se pudo conectar: {e}".replace("\ufffd", ""))
        print("Revisa que el servicio de PostgreSQL este corriendo y la contrasena.")
        return 1

    with admin:
        existe = admin.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (BASE,)
        ).fetchone()

        if existe:
            print(f"La base '{BASE}' ya existe (se volvera a crear el esquema).")
        else:
            admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(BASE)))
            print(f"Base '{BASE}' creada.")

    # 2. Conexion a la base del proyecto
    url = f"postgresql://{USUARIO}:{quote_plus(clave)}@{HOST}:{PUERTO}/{BASE}"
    with psycopg.connect(url) as conn:
        print("Cargando estructura y datos:")
        ejecutar_archivo(conn, DIR_SQL / "01_esquema.sql")
        ejecutar_archivo(conn, DIR_SQL / "02_datos.sql")
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM equipo")
            equipos = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM renta")
            rentas = cur.fetchone()[0]
            cur.execute("SELECT id_equipo, nombre, stock, disponible FROM v_equipo_disponible ORDER BY id_equipo")
            filas = cur.fetchall()

    # 3. Escribir .env
    RUTA_ENV.write_text(
        f"DATABASE_URL={url}\n"
        "CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500,http://localhost:8000\n",
        encoding="utf-8",
    )

    print(f"\nListo: {equipos} equipos, {rentas} rentas.")
    print("Disponibilidad calculada por la vista:")
    for id_equipo, nombre, stock, disponible in filas:
        print(f"   [{id_equipo}] {nombre:<32} stock={stock:<3} disponible={disponible}")
    print(f"\nConfiguracion guardada en {RUTA_ENV}")
    print("Ahora ejecuta:   uvicorn app.main:app --reload")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
