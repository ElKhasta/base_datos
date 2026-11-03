-- =====================================================================
--  EVIDENCIA TECNICA: 8 CONSULTAS SQL
--  Ejecutar despues de 01_esquema.sql y 02_datos.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- CONSULTA 1 | JOIN multiple + filtro: equipos pendientes de devolucion
-- ---------------------------------------------------------------------
SELECT
    c.nombre_completo                AS cliente,
    c.telefono,
    e.nombre                         AS equipo,
    d.cantidad,
    r.fecha_inicio,
    r.fecha_fin_estimada,
    (CURRENT_DATE - r.fecha_fin_estimada) AS dias_de_retraso
FROM detalle_renta d
JOIN renta        r ON r.id_renta  = d.id_renta
JOIN cliente      c ON c.id_cliente = r.id_cliente
JOIN equipo       e ON e.id_equipo  = d.id_equipo
WHERE d.fecha_devolucion IS NULL
ORDER BY r.fecha_fin_estimada;


-- ---------------------------------------------------------------------
-- CONSULTA 2 | JOIN + filtro por cliente: historial de rentas finalizadas
-- ---------------------------------------------------------------------
SELECT
    r.id_renta            AS folio,
    r.fecha_inicio,
    e.nombre              AS equipo,
    d.cantidad,
    d.subtotal,
    d.fecha_devolucion
FROM renta r
JOIN detalle_renta d ON d.id_renta  = r.id_renta
JOIN equipo       e ON e.id_equipo  = d.id_equipo
JOIN estado_renta s ON s.id_estado  = r.id_estado
WHERE r.id_cliente = 3
  AND s.estado = 'Finalizada'
ORDER BY r.id_renta;


-- ---------------------------------------------------------------------
-- CONSULTA 3 | GROUP BY: ingresos generados por categoria de equipo
-- ---------------------------------------------------------------------
SELECT
    cat.nombre_categoria,
    SUM(d.subtotal)  AS ingresos_totales,
    SUM(d.cantidad)  AS articulos_rentados
FROM categoria cat
JOIN equipo        e ON e.id_categoria = cat.id_categoria
JOIN detalle_renta d ON d.id_equipo    = e.id_equipo
GROUP BY cat.nombre_categoria
ORDER BY ingresos_totales DESC;


-- ---------------------------------------------------------------------
-- CONSULTA 4 | Filtro simple + ordenamiento: clientes activos
-- ---------------------------------------------------------------------
SELECT nombre_completo, telefono, email, fecha_alta
FROM cliente
WHERE estatus_activo = TRUE
ORDER BY nombre_completo ASC;


-- ---------------------------------------------------------------------
-- CONSULTA 5 | Filtro sobre inventario: equipos con stock bajo
-- ---------------------------------------------------------------------
SELECT nombre, marca, stock
FROM equipo
WHERE stock < 5
ORDER BY stock ASC;


-- ---------------------------------------------------------------------
-- CONSULTA 6 | LEFT JOIN + GROUP BY: cuantas rentas hay por estado
-- ---------------------------------------------------------------------
SELECT
    s.estado,
    COUNT(r.id_renta) AS total_rentas
FROM estado_renta s
LEFT JOIN renta r ON r.id_estado = s.id_estado
GROUP BY s.estado
ORDER BY total_rentas DESC;


-- ---------------------------------------------------------------------
-- CONSULTA 7 | JOIN + filtro por folio: detalle de una renta concreta
-- ---------------------------------------------------------------------
SELECT
    e.nombre AS equipo,
    d.cantidad,
    d.precio_unitario,
    d.subtotal
FROM detalle_renta d
JOIN equipo e ON e.id_equipo = d.id_equipo
WHERE d.id_renta = 1
ORDER BY d.id_detalle;


-- ---------------------------------------------------------------------
-- CONSULTA 8 | Agregacion global: total realmente cobrado
-- ---------------------------------------------------------------------
SELECT
    COUNT(*)                    AS numero_de_pagos,
    SUM(monto_pagado)           AS ingresos_cobrados,
    ROUND(AVG(monto_pagado), 2) AS pago_promedio
FROM pago;
