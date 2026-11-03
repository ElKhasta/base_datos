-- =====================================================================
--  DATOS DE PRUEBA
--  Ejecutar despues de 01_esquema.sql
-- =====================================================================

-- 1. Estados de renta ------------------------------------------------
INSERT INTO estado_renta (id_estado, estado) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Reservada'),
    (2, 'Activa'),
    (3, 'Finalizada'),
    (4, 'Cancelada');


-- 2. Categorias ------------------------------------------------------
INSERT INTO categoria (id_categoria, nombre_categoria, descripcion) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Audio',       'Microfonos, consolas, bocinas y cableado de audio'),
    (2, 'Video',       'Proyectores, pantallas, camaras y accesorios de video'),
    (3, 'Iluminacion', 'Luces LED, roboticas, laser y estructuras');


-- 3. Clientes --------------------------------------------------------
INSERT INTO cliente (id_cliente, nombre_completo, telefono, email, estatus_activo) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Luis Ramirez',  '5512345678', 'luis@email.com',  TRUE),
    (2, 'David Soto',    '5587654321', 'david@email.com', TRUE),
    (3, 'Adriana Cruz',  '5599887766', 'adri@email.com',  TRUE);


-- 4. Equipos (inventario) -------------------------------------------
INSERT INTO equipo (id_equipo, id_categoria, nombre, marca, precio_renta_diario, stock) OVERRIDING SYSTEM VALUE VALUES
    (1, 1, 'Microfono Inalambrico',     'Shure',   250.00, 10),
    (2, 1, 'Bocina Activa 15 pulgadas', 'JBL',     800.00,  4),
    (3, 2, 'Proyector 4K',              'Epson',  1200.00,  2),
    (4, 3, 'Kit de Luces LED',          'Chauvet', 600.00,  6);


-- 5. Rentas ----------------------------------------------------------
--    El monto_total lo calcula el trigger a partir del detalle.
INSERT INTO renta (id_renta, id_cliente, id_estado, fecha_inicio, fecha_fin_estimada, monto_total)
OVERRIDING SYSTEM VALUE VALUES
    (1, 1, 2, CURRENT_DATE,          CURRENT_DATE + 2, 0),   -- Luis, Activa (2 dias)
    (2, 3, 3, CURRENT_DATE - 10,     CURRENT_DATE - 9, 0);   -- Adriana, Finalizada (1 dia)


-- 6. Detalle de renta (LA RELACION N:M) -----------------------------
--    Renta 1 -> 2 microfonos (250 x 2 dias x 2 pzas = 1000)
--               1 proyector   (1200 x 2 dias x 1 pza = 2400)
--    Renta 2 -> 4 kits de luz (600 x 1 dia x 4 pzas = 2400) ya devueltos
INSERT INTO detalle_renta (id_detalle, id_renta, id_equipo, cantidad, fecha_devolucion, precio_unitario, subtotal)
OVERRIDING SYSTEM VALUE VALUES
    (1, 1, 1, 2, NULL,             250.00, 1000.00),
    (2, 1, 3, 1, NULL,            1200.00, 2400.00),
    (3, 2, 4, 4, CURRENT_DATE - 9, 600.00, 2400.00);


-- 7. Pagos -----------------------------------------------------------
INSERT INTO pago (id_pago, id_renta, monto_pagado, metodo_pago) OVERRIDING SYSTEM VALUE VALUES
    (1, 1, 3400.00, 'Tarjeta'),
    (2, 2, 2400.00, 'Transferencia');


-- 8. Sincronizar las secuencias (obligatorio al usar IDs manuales) ---
SELECT setval(pg_get_serial_sequence('estado_renta', 'id_estado'), (SELECT MAX(id_estado) FROM estado_renta));
SELECT setval(pg_get_serial_sequence('categoria',    'id_categoria'), (SELECT MAX(id_categoria) FROM categoria));
SELECT setval(pg_get_serial_sequence('cliente',      'id_cliente'),   (SELECT MAX(id_cliente) FROM cliente));
SELECT setval(pg_get_serial_sequence('equipo',       'id_equipo'),    (SELECT MAX(id_equipo) FROM equipo));
SELECT setval(pg_get_serial_sequence('renta',        'id_renta'),     (SELECT MAX(id_renta) FROM renta));
SELECT setval(pg_get_serial_sequence('detalle_renta','id_detalle'),   (SELECT MAX(id_detalle) FROM detalle_renta));
SELECT setval(pg_get_serial_sequence('pago',         'id_pago'),      (SELECT MAX(id_pago) FROM pago));


-- 9. Verificacion rapida ---------------------------------------------
SELECT id_renta, monto_total FROM renta ORDER BY id_renta;
SELECT id_equipo, nombre, stock, unidades_rentadas, disponible
  FROM v_equipo_disponible ORDER BY id_equipo;
