-- =====================================================================
--  MIGRACION 05 - ROLES, SESIONES, SOLICITUDES Y AUDITORIA
--  ---------------------------------------------------------------------
--  Este archivo se ejecuta UNA VEZ sobre una base que ya tiene los datos
--  de 01_esquema.sql + 02_datos.sql. Es idempotente: se puede volver a
--  correr sin borrar informacion.
--
--  Que agrega:
--    - Catalogo de roles: admin / cliente
--    - Usuarios con contrasena hasheada (PBKDF2-SHA256)
--    - Relacion usuario -> cliente (una cuenta por cliente)
--    - Estado de renta "Solicitada" (no aparta inventario)
--    - Columnas de trazabilidad en renta (quien solicita / aprueba)
--    - Bitacora de auditoria
--
--  Uso:
--      psql -U postgres -d renta_equipos -f sql/05_roles.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. ROLES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rol (
    id_rol  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  VARCHAR(20) NOT NULL UNIQUE,
    CONSTRAINT chk_rol_nombre CHECK (nombre IN ('admin', 'cliente'))
);

INSERT INTO rol (nombre)
VALUES ('admin'), ('cliente')
ON CONFLICT (nombre) DO NOTHING;


-- ---------------------------------------------------------------------
-- 2. USUARIOS
--    - admin: id_cliente es NULL
--    - cliente: id_cliente apunta a su ficha en la tabla cliente
--    - password_hash nunca guarda la contrasena en texto plano
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre        VARCHAR(100) NOT NULL,
    id_rol        INTEGER NOT NULL,
    id_cliente    INTEGER UNIQUE,
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_usuario_cliente
        FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usuario_rol ON usuario (id_rol);


-- ---------------------------------------------------------------------
-- 3. ESTADO "Solicitada"
--    La vista v_equipo_disponible solo descuenta Reservada/Activa, asi
--    que una solicitud NO aparta inventario hasta que el admin la aprueba.
-- ---------------------------------------------------------------------
INSERT INTO estado_renta (estado)
VALUES ('Solicitada')
ON CONFLICT (estado) DO NOTHING;


-- ---------------------------------------------------------------------
-- 4. TRAZABILIDAD DE LA SOLICITUD EN LA RENTA
-- ---------------------------------------------------------------------
ALTER TABLE renta
    ADD COLUMN IF NOT EXISTS id_usuario_solicita INTEGER
        REFERENCES usuario (id_usuario) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS id_usuario_aprueba INTEGER
        REFERENCES usuario (id_usuario) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;


-- ---------------------------------------------------------------------
-- 5. AUDITORIA
--    Registro de acciones importantes. No tiene FK a renta/pago para
--    poder conservar el rastro aunque el registro original se elimine.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario   INTEGER REFERENCES usuario (id_usuario) ON DELETE SET NULL,
    accion       VARCHAR(40) NOT NULL,
    entidad      VARCHAR(30) NOT NULL,
    id_entidad   INTEGER,
    detalle      TEXT,
    fecha        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha  ON auditoria (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria (accion);

COMMIT;

-- Verificacion
SELECT r.nombre AS rol, COUNT(u.id_usuario) AS usuarios
  FROM rol r LEFT JOIN usuario u ON u.id_rol = r.id_rol
 GROUP BY r.nombre ORDER BY r.nombre;

SELECT id_estado, estado FROM estado_renta ORDER BY id_estado;
