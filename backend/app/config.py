"""Configuracion central del backend.

Lee las variables del archivo .env (misma carpeta que requirements.txt).
"""
from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent      # .../backend
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/renta_equipos",
)

# Origenes permitidos para el front cuando se trabaja con Live Server.
CORS_ORIGINS = [
    origen.strip()
    for origen in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5500,http://127.0.0.1:5500,http://localhost:8000",
    ).split(",")
    if origen.strip()
]

# Carpeta del front que se sirve en la raiz "/"
FRONTEND_DIR = Path(
    os.getenv("FRONTEND_DIR", str(BASE_DIR.parent / "frontend"))
).resolve()

# ---------------------------------------------------------------------
# Sesiones y roles
# ---------------------------------------------------------------------
# Clave para firmar la cookie de sesion. En produccion debe ser larga y
# aleatoria; crear_bd.py la genera automaticamente en backend/.env.
SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "rentavisual-dev-secret-cambia-esta-clave-en-produccion",
)
SESSION_HORAS = int(os.getenv("SESSION_HORAS", "8"))
COOKIE_SEGURA = os.getenv("COOKIE_SECURE", "false").lower() in ("1", "true", "sí", "si")

# Usuarios iniciales que se crean solos al arrancar la API si no existen.
# Cambia la contrasena en .env antes de usar el sistema fuera de tu equipo.
SEMBRAR_USUARIOS = os.getenv("SEMBRAR_USUARIOS", "true").lower() in ("1", "true", "sí", "si")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@rentavisual.mx")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin123!")
DEMO_CLIENTE_ID = int(os.getenv("DEMO_CLIENTE_ID", "1"))
DEMO_CLIENTE_EMAIL = os.getenv("DEMO_CLIENTE_EMAIL", "luis@rentavisual.mx")
DEMO_CLIENTE_PASSWORD = os.getenv("DEMO_CLIENTE_PASSWORD", "Cliente123!")
