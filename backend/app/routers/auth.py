"""Autenticacion: login, registro, logout, perfil y cambio de contrasena."""
import time
from collections import deque
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from ..config import SESSION_HORAS
from ..db import get_db
from ..schemas import LoginRequest, PasswordChange, RegistroRequest
from ..security import (
    cerrar_sesion,
    crear_sesion,
    hash_password,
    leer_sesion,
    registrar_auditoria,
    usuario_actual,
    verificar_password,
)

router = APIRouter(prefix="/auth", tags=["Autenticacion"])

# ---------------------------------------------------------------------
# Limite simple de intentos de login (5 fallos por minuto y por IP+correo).
# Vive en memoria: suficiente para un proyecto de un solo servidor.
# ---------------------------------------------------------------------
MAX_INTENTOS = 5
VENTANA_SEGUNDOS = 60
_intentos: dict[str, deque[float]] = {}
_lock = Lock()


def _clave_intento(request: Request, email: str) -> str:
    ip = request.client.host if request.client else "local"
    return f"{ip}|{email}"


def _revisar_limite(clave: str) -> None:
    ahora = time.monotonic()
    with _lock:
        cola = _intentos.get(clave)
        if not cola:
            return
        while cola and ahora - cola[0] > VENTANA_SEGUNDOS:
            cola.popleft()
        if len(cola) >= MAX_INTENTOS:
            raise HTTPException(
                429,
                "Demasiados intentos fallidos. Espera un minuto e inténtalo de nuevo",
            )


def _anotar_fallo(clave: str) -> None:
    with _lock:
        _intentos.setdefault(clave, deque()).append(time.monotonic())


def _limpiar_intentos(clave: str) -> None:
    with _lock:
        _intentos.pop(clave, None)


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
SELECT_USUARIO = """
SELECT u.id_usuario, u.email, u.password_hash, u.nombre, u.activo,
       u.id_cliente, r.nombre AS rol,
       c.nombre_completo AS cliente, c.estatus_activo AS cliente_activo
  FROM usuario u
  JOIN rol r          ON r.id_rol = u.id_rol
  LEFT JOIN cliente c ON c.id_cliente = u.id_cliente
 WHERE lower(u.email) = lower(%s)
"""


def _perfil(usuario: dict) -> dict:
    """Datos seguros para el front: nunca incluye el hash."""
    return {
        "id_usuario": usuario["id_usuario"],
        "email": usuario["email"],
        "nombre": usuario["nombre"],
        "rol": usuario["rol"],
        "id_cliente": usuario["id_cliente"],
        "cliente": usuario.get("cliente"),
        "session_horas": SESSION_HORAS,
    }


def _validar_cuenta_activa(usuario: dict) -> None:
    if not usuario["activo"]:
        raise HTTPException(403, "Tu cuenta está desactivada. Contacta al administrador")
    if usuario["id_cliente"] is not None and not usuario["cliente_activo"]:
        raise HTTPException(403, "Tu cuenta de cliente está dada de baja")


# ---------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------
@router.post("/login")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db=Depends(get_db),
):
    email = str(payload.email).lower()
    clave = _clave_intento(request, email)
    _revisar_limite(clave)

    with db.cursor() as cur:
        cur.execute(SELECT_USUARIO, (email,))
        usuario = cur.fetchone()

    if not usuario or not verificar_password(payload.password, usuario["password_hash"]):
        _anotar_fallo(clave)
        raise HTTPException(401, "Correo o contraseña incorrectos")

    _validar_cuenta_activa(usuario)
    _limpiar_intentos(clave)
    crear_sesion(response, usuario["id_usuario"])

    with db.cursor() as cur:
        registrar_auditoria(
            cur,
            usuario["id_usuario"],
            "login",
            "usuario",
            usuario["id_usuario"],
            f"Inicio de sesión ({usuario['rol']})",
        )

    return _perfil(usuario)


@router.post("/registro", status_code=201)
def registro(payload: RegistroRequest, response: Response, db=Depends(get_db)):
    """Auto-registro de un cliente nuevo.

    Crea su ficha en `cliente` y su cuenta en `usuario` en una sola
    transaccion. Si el correo ya pertenece a un cliente existente, se
    rechaza: en ese caso el admin debe otorgar el acceso desde el panel.
    """
    email = str(payload.email).lower()

    with db.transaction():
        with db.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM cliente WHERE lower(email) = lower(%s)", (email,)
            )
            if cur.fetchone():
                raise HTTPException(
                    409,
                    "Ese correo ya pertenece a un cliente registrado. "
                    "Pide al administrador que te otorgue acceso",
                )

            cur.execute(
                "SELECT 1 FROM usuario WHERE lower(email) = lower(%s)", (email,)
            )
            if cur.fetchone():
                raise HTTPException(409, "Ese correo ya tiene una cuenta")

            cur.execute(
                """INSERT INTO cliente (nombre_completo, telefono, email)
                   VALUES (%s, %s, %s)
                   RETURNING id_cliente""",
                (payload.nombre, payload.telefono, email),
            )
            id_cliente = cur.fetchone()["id_cliente"]

            cur.execute(
                """INSERT INTO usuario (email, password_hash, nombre, id_rol, id_cliente)
                   VALUES (%s, %s, %s,
                           (SELECT id_rol FROM rol WHERE nombre = 'cliente'),
                           %s)
                   RETURNING id_usuario""",
                (email, hash_password(payload.password), payload.nombre, id_cliente),
            )
            id_usuario = cur.fetchone()["id_usuario"]

            registrar_auditoria(
                cur,
                id_usuario,
                "registro",
                "usuario",
                id_usuario,
                f"Cliente auto-registrado (cliente #{id_cliente})",
            )

    crear_sesion(response, id_usuario)
    return {
        "id_usuario": id_usuario,
        "email": email,
        "nombre": payload.nombre,
        "rol": "cliente",
        "id_cliente": id_cliente,
        "cliente": payload.nombre,
        "session_horas": SESSION_HORAS,
    }


@router.post("/logout")
def logout(request: Request, response: Response, db=Depends(get_db)):
    # Se anota el cierre antes de borrar la cookie; si no hay sesion, igual responde ok.
    id_usuario = leer_sesion(request)
    if id_usuario is not None:
        with db.cursor() as cur:
            cur.execute(
                """SELECT u.id_usuario, r.nombre AS rol
                     FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
                    WHERE u.id_usuario = %s""",
                (id_usuario,),
            )
            usuario = cur.fetchone()
            if usuario:
                registrar_auditoria(
                    cur,
                    usuario["id_usuario"],
                    "logout",
                    "usuario",
                    usuario["id_usuario"],
                    f"Cierre de sesión ({usuario['rol']})",
                )

    cerrar_sesion(response)
    return {"ok": True}


@router.get("/yo")
def yo(usuario: dict = Depends(usuario_actual)):
    return _perfil(usuario)


@router.put("/password")
def cambiar_password(
    payload: PasswordChange,
    usuario: dict = Depends(usuario_actual),
    db=Depends(get_db),
):
    if payload.actual == payload.nueva:
        raise HTTPException(400, "La nueva contraseña debe ser diferente a la actual")

    with db.cursor() as cur:
        cur.execute(
            "SELECT password_hash FROM usuario WHERE id_usuario = %s",
            (usuario["id_usuario"],),
        )
        fila = cur.fetchone()

        if not fila or not verificar_password(payload.actual, fila["password_hash"]):
            raise HTTPException(401, "La contraseña actual no es correcta")

        cur.execute(
            "UPDATE usuario SET password_hash = %s WHERE id_usuario = %s",
            (hash_password(payload.nueva), usuario["id_usuario"]),
        )
        registrar_auditoria(
            cur,
            usuario["id_usuario"],
            "cambio_password",
            "usuario",
            usuario["id_usuario"],
            "Contraseña actualizada",
        )

    return {"ok": True, "mensaje": "Contraseña actualizada"}
