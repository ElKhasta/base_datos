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
