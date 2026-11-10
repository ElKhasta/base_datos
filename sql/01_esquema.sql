-- =====================================================================
--  SISTEMA DE RENTA DE EQUIPOS AUDIOVISUALES
--  SGBD: PostgreSQL 18
--  Archivo: 01_esquema.sql  ->  estructura de la base de datos
--
--  Orden de ejecución:
--      1) 01_esquema.sql   (crea tablas, vistas y triggers)
--      2) 02_datos.sql     (datos de prueba)
--      3) 03_consultas.sql (las 8 consultas de la evidencia tecnica)
-- =====================================================================

DROP VIEW  IF EXISTS v_equipo_disponible;
DROP TABLE IF EXISTS auditoria     CASCADE;
DROP TABLE IF EXISTS pago          CASCADE;
DROP TABLE IF EXISTS detalle_renta CASCADE;
DROP TABLE IF EXISTS renta         CASCADE;
DROP TABLE IF EXISTS usuario       CASCADE;
DROP TABLE IF EXISTS rol           CASCADE;
DROP TABLE IF EXISTS equipo        CASCADE;
DROP TABLE IF EXISTS estado_renta  CASCADE;
DROP TABLE IF EXISTS cliente       CASCADE;
DROP TABLE IF EXISTS categoria     CASCADE;


-- ---------------------------------------------------------------------
-- 1. CATEGORIA  (Audio, Video, Iluminacion...)
-- ---------------------------------------------------------------------
CREATE TABLE categoria (
    id_categoria     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_categoria VARCHAR(50) NOT NULL UNIQUE,
    descripcion      TEXT
);


-- ---------------------------------------------------------------------
-- 2. CLIENTE  (quien renta el equipo)
-- ---------------------------------------------------------------------
CREATE TABLE cliente (
    id_cliente      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    telefono        VARCHAR(20),
    email           VARCHAR(100) UNIQUE,
    estatus_activo  BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_alta      DATE NOT NULL DEFAULT CURRENT_DATE
);


-- ---------------------------------------------------------------------
-- 3. ROLES Y USUARIOS (para el login y los permisos)
--    - admin:   administra todo el sistema
--    - cliente: solo puede consultar el catalogo y solicitar rentas
-- ---------------------------------------------------------------------
CREATE TABLE rol (
    id_rol  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  VARCHAR(20) NOT NULL UNIQUE,
    CONSTRAINT chk_rol_nombre CHECK (nombre IN ('admin', 'cliente'))
);

-- La contrasena se guarda como hash (PBKDF2-SHA256), nunca en texto plano.
CREATE TABLE usuario (
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

CREATE INDEX idx_usuario_rol ON usuario (id_rol);


-- ---------------------------------------------------------------------
-- 4. ESTADO_RENTA  (catalogo: Solicitada, Reservada, Activa, Finalizada, Cancelada)
-- ---------------------------------------------------------------------
CREATE TABLE estado_renta (
    id_estado INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estado    VARCHAR(30) NOT NULL UNIQUE
);


-- ---------------------------------------------------------------------
-- 4. EQUIPO  (inventario)
--    stock = numero total de unidades fisicas que posee la empresa.
--    Las unidades ocupadas se calculan con la vista v_equipo_disponible.
-- ---------------------------------------------------------------------
CREATE TABLE equipo (
    id_equipo           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_categoria        INTEGER NOT NULL,
    nombre              VARCHAR(100) NOT NULL,
    marca               VARCHAR(50),
    precio_renta_diario NUMERIC(10,2) NOT NULL CHECK (precio_renta_diario >= 0),
    stock               INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),

    CONSTRAINT fk_equipo_categoria
        FOREIGN KEY (id_categoria) REFERENCES categoria (id_categoria)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT uq_equipo_nombre_marca UNIQUE (nombre, marca)
);


-- ---------------------------------------------------------------------
-- 5. RENTA  (el contrato general)
--    Una renta nace como "Solicitada" (no aparta stock), el admin la
--    aprueba y pasa a "Reservada" o "Activa".
-- ---------------------------------------------------------------------
CREATE TABLE renta (
    id_renta           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente         INTEGER NOT NULL,
    id_estado          INTEGER NOT NULL,
    fecha_registro     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_inicio       DATE NOT NULL,
    fecha_fin_estimada DATE NOT NULL,
    monto_total        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monto_total >= 0),

    -- Trazabilidad de la solicitud
    id_usuario_solicita INTEGER,
    id_usuario_aprueba  INTEGER,
    fecha_aprobacion    TIMESTAMPTZ,
    motivo_rechazo      TEXT,

    CONSTRAINT fk_renta_cliente
        FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente)
        ON DELETE RESTRICT,

    CONSTRAINT fk_renta_estado
        FOREIGN KEY (id_estado) REFERENCES estado_renta (id_estado)
        ON DELETE RESTRICT,

    CONSTRAINT fk_renta_solicita
        FOREIGN KEY (id_usuario_solicita) REFERENCES usuario (id_usuario)
        ON DELETE SET NULL,

    CONSTRAINT fk_renta_aprueba
        FOREIGN KEY (id_usuario_aprueba) REFERENCES usuario (id_usuario)
        ON DELETE SET NULL,

    -- Restriccion logica: no puedes entregar antes de iniciar
    CONSTRAINT chk_renta_fechas CHECK (fecha_fin_estimada >= fecha_inicio)
);

CREATE INDEX idx_renta_cliente ON renta (id_cliente);
CREATE INDEX idx_renta_estado  ON renta (id_estado);


-- ---------------------------------------------------------------------
-- 6. DETALLE_RENTA  ->  RESUELVE LA RELACION N:M  RENTA <-> EQUIPO
--    Aqui vive la cantidad y la fecha de devolucion de cada equipo.
-- ---------------------------------------------------------------------
CREATE TABLE detalle_renta (
    id_detalle       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_renta         INTEGER NOT NULL,
    id_equipo        INTEGER NOT NULL,
    cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
    fecha_devolucion DATE,                -- NULL = aun no lo devuelven
    precio_unitario  NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal         NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),

    CONSTRAINT fk_detalle_renta
        FOREIGN KEY (id_renta) REFERENCES renta (id_renta)
        ON DELETE CASCADE,

    CONSTRAINT fk_detalle_equipo
        FOREIGN KEY (id_equipo) REFERENCES equipo (id_equipo)
        ON DELETE RESTRICT,

    -- Un mismo equipo no puede aparecer dos veces en la misma renta
    CONSTRAINT uq_detalle_renta_equipo UNIQUE (id_renta, id_equipo)
);

CREATE INDEX idx_detalle_equipo      ON detalle_renta (id_equipo);
CREATE INDEX idx_detalle_pendientes  ON detalle_renta (fecha_devolucion);


-- ---------------------------------------------------------------------
-- 7. PAGO  (abonos o liquidacion de una renta)
-- ---------------------------------------------------------------------
CREATE TABLE pago (
    id_pago      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_renta     INTEGER NOT NULL,
    monto_pagado NUMERIC(10,2) NOT NULL CHECK (monto_pagado > 0),
    fecha_pago   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metodo_pago  VARCHAR(20) NOT NULL
        CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia')),

    CONSTRAINT fk_pago_renta
        FOREIGN KEY (id_renta) REFERENCES renta (id_renta)
        ON DELETE CASCADE
);

CREATE INDEX idx_pago_renta ON pago (id_renta);


-- ---------------------------------------------------------------------
-- 8. AUDITORIA  (quien hizo que y cuando)
--    No tiene FK hacia renta/pago para conservar el rastro aunque el
--    registro original se elimine.
-- ---------------------------------------------------------------------
CREATE TABLE auditoria (
    id_auditoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario   INTEGER REFERENCES usuario (id_usuario) ON DELETE SET NULL,
    accion       VARCHAR(40) NOT NULL,
    entidad      VARCHAR(30) NOT NULL,
    id_entidad   INTEGER,
    detalle      TEXT,
    fecha        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auditoria_fecha  ON auditoria (fecha DESC);
CREATE INDEX idx_auditoria_accion ON auditoria (accion);


-- =====================================================================
--  LOGICA AUTOMATICA (triggers)
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) Recalcular monto_total de la renta cada vez que cambia su detalle.
--    Asi el total NUNCA se desincroniza de los subtotales.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_recalcular_monto_renta()
RETURNS TRIGGER AS $$
DECLARE
    v_id_renta INTEGER;
BEGIN
    v_id_renta := COALESCE(NEW.id_renta, OLD.id_renta);

    UPDATE renta
       SET monto_total = COALESCE(
               (SELECT SUM(subtotal) FROM detalle_renta WHERE id_renta = v_id_renta), 0)
     WHERE id_renta = v_id_renta;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detalle_monto
AFTER INSERT OR UPDATE OR DELETE ON detalle_renta
FOR EACH ROW EXECUTE FUNCTION fn_recalcular_monto_renta();


-- ---------------------------------------------------------------------
-- B) La fecha de devolucion no puede ser anterior al inicio de la renta.
--    (No se puede validar con CHECK porque vive en otra tabla.)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_fecha_devolucion()
RETURNS TRIGGER AS $$
DECLARE
    v_inicio DATE;
BEGIN
    IF NEW.fecha_devolucion IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT fecha_inicio INTO v_inicio
      FROM renta WHERE id_renta = NEW.id_renta;

    IF NEW.fecha_devolucion < v_inicio THEN
        RAISE EXCEPTION
            'La fecha de devolucion (%) no puede ser anterior al inicio de la renta (%)',
            NEW.fecha_devolucion, v_inicio;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detalle_fecha_devolucion
BEFORE INSERT OR UPDATE OF fecha_devolucion ON detalle_renta
FOR EACH ROW EXECUTE FUNCTION fn_validar_fecha_devolucion();


-- =====================================================================
--  VISTA DE DISPONIBILIDAD
--  disponible = stock fisico - unidades NO devueltas de rentas Reservadas/Activas
--  Es la unica fuente de verdad: nunca se descuadra.
-- =====================================================================
CREATE OR REPLACE VIEW v_equipo_disponible AS
SELECT
    e.id_equipo,
    e.nombre,
    e.marca,
    e.id_categoria,
    c.nombre_categoria,
    e.precio_renta_diario,
    e.stock,
    COALESCE(SUM(d.cantidad) FILTER (
        WHERE d.fecha_devolucion IS NULL
          AND er.estado IN ('Reservada', 'Activa')), 0)::INTEGER AS unidades_rentadas,
    (e.stock - COALESCE(SUM(d.cantidad) FILTER (
        WHERE d.fecha_devolucion IS NULL
          AND er.estado IN ('Reservada', 'Activa')), 0))::INTEGER AS disponible
FROM equipo e
JOIN categoria c        ON c.id_categoria = e.id_categoria
LEFT JOIN detalle_renta d ON d.id_equipo = e.id_equipo
LEFT JOIN renta r         ON r.id_renta  = d.id_renta
LEFT JOIN estado_renta er ON er.id_estado = r.id_estado
GROUP BY e.id_equipo, c.nombre_categoria;
