-- =====================================================================
--  PRUEBA DEL PROCESO CENTRAL (sin dejar basura en la base)
--  Simula crear una renta y devolverla, y al final hace ROLLBACK.
--  Sirve como evidencia de que la logica de negocio funciona.
-- =====================================================================

BEGIN;

-- Disponibilidad ANTES (equipo 2 = Bocina JBL, stock 4)
SELECT id_equipo, nombre, stock, unidades_rentadas, disponible
  FROM v_equipo_disponible WHERE id_equipo = 2;

-- 1) Crear la renta (2 dias)
INSERT INTO renta (id_cliente, id_estado, fecha_inicio, fecha_fin_estimada, monto_total)
VALUES (2,
        (SELECT id_estado FROM estado_renta WHERE estado = 'Activa'),
        CURRENT_DATE,
        CURRENT_DATE + 2,
        0)
RETURNING id_renta;

-- 2) Insertar el detalle (2 bocinas x 800 x 2 dias = 3200)
INSERT INTO detalle_renta (id_renta, id_equipo, cantidad, precio_unitario, subtotal)
VALUES (currval('renta_id_renta_seq'), 2, 2, 800.00, 3200.00);

-- 3) El trigger debio actualizar el total
SELECT id_renta, monto_total FROM renta ORDER BY id_renta DESC LIMIT 1;

-- 4) Disponibilidad DESPUES (debe bajar de 4 a 2)
SELECT id_equipo, nombre, stock, unidades_rentadas, disponible
  FROM v_equipo_disponible WHERE id_equipo = 2;

-- 5) Registrar la devolucion de todas las lineas pendientes de esa renta
UPDATE detalle_renta
   SET fecha_devolucion = CURRENT_DATE
 WHERE id_renta = currval('renta_id_renta_seq')
   AND fecha_devolucion IS NULL;

-- 6) La disponibilidad debe volver a 4
SELECT id_equipo, nombre, stock, unidades_rentadas, disponible
  FROM v_equipo_disponible WHERE id_equipo = 2;

-- 7) Probar que el trigger de fechas rechaza una devolucion invalida
--    (descomenta para ver el error; aborta la transaccion)
-- UPDATE detalle_renta SET fecha_devolucion = '2000-01-01' WHERE id_detalle = 1;

ROLLBACK;
