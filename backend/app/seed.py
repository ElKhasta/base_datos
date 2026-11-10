"""Crea los usuarios iniciales al arrancar la API.

- Un administrador (ADMIN_EMAIL / ADMIN_PASSWORD).
- Una cuenta de demostracion ligada a un cliente existente
  (DEMO_CLIENTE_ID / DEMO_CLIENTE_EMAIL / DEMO_CLIENTE_PASSWORD).

Solo inserta si no existen: nunca pisa una contrasena ya cambiada.
Si la migracion sql/05_roles.sql no se ha aplicado, avisa y deja que la
API arranque igual (las rutas de negocio siguen funcionando).
"""
import logging

from .config import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    DEMO_CLIENTE_EMAIL,
    DEMO_CLIENTE_ID,
    DEMO_CLIENTE_PASSWORD,
    SEMBRAR_USUARIOS,
)
from .db import pool
from .security import hash_password

log = logging.getLogger("rentavisual.seed")


def _crear_admin(cur) -> None:
    cur.execute("SELECT 1 FROM usuario WHERE lower(email) = lower(%s)", (ADMIN_EMAIL,))
    if cur.fetchone():
        return

    cur.execute(
        """INSERT INTO usuario (email, password_hash, nombre, id_rol, id_cliente)
           VALUES (%s, %s, 'Administrador',
                   (SELECT id_rol FROM rol WHERE nombre = 'admin'), NULL)""",
        (ADMIN_EMAIL, hash_password(ADMIN_PASSWORD)),
    )
    log.info("Usuario administrador creado: %s", ADMIN_EMAIL)


def _crear_cliente_demo(cur) -> None:
    if DEMO_CLIENTE_ID <= 0:
        return

    cur.execute(
        "SELECT nombre_completo FROM cliente WHERE id_cliente = %s",
        (DEMO_CLIENTE_ID,),
    )
    cliente = cur.fetchone()
    if not cliente:
        log.warning(
            "No existe el cliente %s para la cuenta de demostracion", DEMO_CLIENTE_ID
        )
        return

    cur.execute(
        "SELECT 1 FROM usuario WHERE id_cliente = %s", (DEMO_CLIENTE_ID,)
    )
    if cur.fetchone():
        return

    cur.execute(
        "SELECT 1 FROM usuario WHERE lower(email) = lower(%s)", (DEMO_CLIENTE_EMAIL,)
    )
    if cur.fetchone():
        log.warning("El correo %s ya esta ocupado; no se creo la cuenta demo", DEMO_CLIENTE_EMAIL)
        return

    cur.execute(
        """INSERT INTO usuario (email, password_hash, nombre, id_rol, id_cliente)
           VALUES (%s, %s, %s,
                   (SELECT id_rol FROM rol WHERE nombre = 'cliente'), %s)""",
        (
            DEMO_CLIENTE_EMAIL,
            hash_password(DEMO_CLIENTE_PASSWORD),
            cliente["nombre_completo"],
            DEMO_CLIENTE_ID,
        ),
    )
    log.info(
        "Cuenta de cliente demo creada: %s (cliente #%s)",
        DEMO_CLIENTE_EMAIL,
        DEMO_CLIENTE_ID,
    )


def sembrar_usuarios() -> None:
    if not SEMBRAR_USUARIOS:
        return

    try:
        with pool.connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT 1 FROM rol LIMIT 1")

            cur.execute(
                """INSERT INTO rol (nombre) VALUES ('admin'), ('cliente')
                   ON CONFLICT (nombre) DO NOTHING"""
            )
            _crear_admin(cur)
            _crear_cliente_demo(cur)
    except Exception as exc:  # noqa: BLE001 - no queremos tumbar la API
        log.warning(
            "No se pudieron sembrar los usuarios iniciales. "
            "Aplica sql/05_roles.sql y reinicia. Detalle: %s",
            exc,
        )
