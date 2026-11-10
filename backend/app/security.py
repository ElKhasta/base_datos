"""Seguridad: hash de contrasenas, cookie de sesion y dependencias de rol.

No usa librerias externas: PBKDF2-SHA256 viene en la libreria estandar de
Python y la cookie se firma con HMAC-SHA256.

La cookie solo guarda el id del usuario y la fecha de expiracion. El rol
y el cliente SIEMPRE se consultan en la base de datos en cada peticion,
asi que desactivar un usuario o cambiarle el rol surte efecto de inmediato.
"""
import base64
import hashlib
import hmac
import os
import time

from fastapi import Depends, HTTPException, Request, Response

from .config import COOKIE_SEGURA, SECRET_KEY, SESSION_HORAS
from .db import get_db

COOKIE_SESION = "rv_sesion"
ITERACIONES = 600_000
ALGORITMO = "pbkdf2_sha256"


# ---------------------------------------------------------------------
# Contrasenas
# ---------------------------------------------------------------------
def _b64(datos: bytes) -> str:
    return base64.b64encode(datos).decode("ascii")


def _bytes(texto: str) -> bytes:
    return base64.b64decode(texto.encode("ascii"))


def hash_password(contrasena: str) -> str:
    """Devuelve 'pbkdf2_sha256$iteraciones$salt$hash'."""
    sal = os.urandom(16)
    derivada = hashlib.pbkdf2_hmac("sha256", contrasena.encode("utf-8"), sal, ITERACIONES)
    return f"{ALGORITMO}${ITERACIONES}${_b64(sal)}${_b64(derivada)}"


def verificar_password(contrasena: str, almacenado: str | None) -> bool:
    """Compara en tiempo constante. Un hash corrupto simplemente no coincide."""
    if not almacenado:
        return False
    try:
        algoritmo, iteraciones, sal, esperado = almacenado.split("$", 3)
        if algoritmo != ALGORITMO:
            return False
        derivada = hashlib.pbkdf2_hmac(
            "sha256", contrasena.encode("utf-8"), _bytes(sal), int(iteraciones)
        )
        return hmac.compare_digest(derivada, _bytes(esperado))
    except (ValueError, TypeError):
        return False


# ---------------------------------------------------------------------
# Cookie de sesion firmada
# ---------------------------------------------------------------------
def _firmar(payload: str) -> str:
    return hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("ascii"), hashlib.sha256).hexdigest()


def crear_sesion(respuesta: Response, id_usuario: int) -> None:
    expira = int(time.time()) + SESSION_HORAS * 3600
    payload = f"{id_usuario}.{expira}"
    respuesta.set_cookie(
        key=COOKIE_SESION,
        value=f"{payload}.{_firmar(payload)}",
        max_age=SESSION_HORAS * 3600,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SEGURA,
        path="/",
    )


def cerrar_sesion(respuesta: Response) -> None:
    respuesta.delete_cookie(
        key=COOKIE_SESION,
        path="/",
        httponly=True,
        samesite="lax",
        secure=COOKIE_SEGURA,
    )


def leer_sesion(request: Request) -> int | None:
    token = request.cookies.get(COOKIE_SESION)
    if not token:
        return None
    try:
        id_usuario, expira, firma = token.split(".")
        if not hmac.compare_digest(_firmar(f"{id_usuario}.{expira}"), firma):
            return None
        if int(expira) < int(time.time()):
            return None
        return int(id_usuario)
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------
# Dependencias de FastAPI
# ---------------------------------------------------------------------
def usuario_actual(request: Request, db=Depends(get_db)) -> dict:
    """Devuelve el usuario de la sesion o lanza 401."""
    id_usuario = leer_sesion(request)
    if id_usuario is None:
        raise HTTPException(401, "Inicia sesión para continuar")

    with db.cursor() as cur:
        cur.execute(
            """SELECT u.id_usuario, u.email, u.nombre, u.activo,
                      u.id_cliente, r.nombre AS rol,
                      c.nombre_completo AS cliente,
                      c.estatus_activo AS cliente_activo
                 FROM usuario u
                 JOIN rol r          ON r.id_rol = u.id_rol
                 LEFT JOIN cliente c ON c.id_cliente = u.id_cliente
                WHERE u.id_usuario = %s""",
            (id_usuario,),
        )
        usuario = cur.fetchone()

    if not usuario or not usuario["activo"]:
        raise HTTPException(401, "Tu cuenta está desactivada. Contacta al administrador")
    if usuario["id_cliente"] is not None and not usuario["cliente_activo"]:
        raise HTTPException(401, "Tu cuenta de cliente está dada de baja")

    return usuario


def requiere_admin(usuario: dict = Depends(usuario_actual)) -> dict:
    if usuario["rol"] != "admin":
        raise HTTPException(403, "No tienes permiso para realizar esta acción")
    return usuario


def requiere_cliente(usuario: dict = Depends(usuario_actual)) -> dict:
    if usuario["id_cliente"] is None:
        raise HTTPException(403, "Tu cuenta no está ligada a un cliente")
    return usuario


# ---------------------------------------------------------------------
# Auditoria
# ---------------------------------------------------------------------
def registrar_auditoria(
    cur,
    id_usuario: int | None,
    accion: str,
    entidad: str,
    id_entidad: int | None = None,
    detalle: str | None = None,
) -> None:
    """Inserta una fila en la bitacora usando el cursor de la transaccion actual."""
    cur.execute(
        """INSERT INTO auditoria (id_usuario, accion, entidad, id_entidad, detalle)
           VALUES (%s, %s, %s, %s, %s)""",
        (id_usuario, accion, entidad, id_entidad, detalle),
    )
