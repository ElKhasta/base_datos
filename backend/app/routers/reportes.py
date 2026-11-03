"""Reportes: las consultas SQL con JOIN / filtros / GROUP BY expuestas al front."""
from fastapi import APIRouter, Depends, Query

from ..db import get_db

router = APIRouter(prefix="/reportes", tags=["Reportes"])


@router.get("/pendientes-devolucion")
def pendientes_devolucion(db=Depends(get_db)):
    """CONSULTA 1: JOIN multiple + filtro (fecha_devolucion IS NULL)."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT r.id_renta, r.id_cliente, c.nombre_completo AS cliente, c.telefono,
                   d.id_detalle, d.id_equipo, e.nombre AS equipo, d.cantidad,
                   r.fecha_inicio, r.fecha_fin_estimada,
                   (CURRENT_DATE - r.fecha_fin_estimada) AS dias_de_retraso
              FROM detalle_renta d
              JOIN renta        r ON r.id_renta   = d.id_renta
              JOIN cliente      c ON c.id_cliente = r.id_cliente
              JOIN equipo       e ON e.id_equipo  = d.id_equipo
             WHERE d.fecha_devolucion IS NULL
             ORDER BY r.fecha_fin_estimada
        """)
        return cur.fetchall()


@router.get("/ingresos-por-categoria")
def ingresos_por_categoria(db=Depends(get_db)):
    """CONSULTA 3: GROUP BY con SUM."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT cat.nombre_categoria,
                   SUM(d.subtotal) AS ingresos_totales,
                   SUM(d.cantidad) AS articulos_rentados
              FROM categoria cat
              JOIN equipo        e ON e.id_categoria = cat.id_categoria
              JOIN detalle_renta d ON d.id_equipo    = e.id_equipo
             GROUP BY cat.nombre_categoria
             ORDER BY ingresos_totales DESC
        """)
        return cur.fetchall()


@router.get("/rentas-por-estado")
def rentas_por_estado(db=Depends(get_db)):
    """CONSULTA 6: LEFT JOIN + COUNT."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT s.estado, COUNT(r.id_renta) AS total_rentas
              FROM estado_renta s
              LEFT JOIN renta r ON r.id_estado = s.id_estado
             GROUP BY s.estado
             ORDER BY total_rentas DESC
        """)
        return cur.fetchall()


@router.get("/inventario-bajo")
def inventario_bajo(limite: int = Query(default=5, ge=1), db=Depends(get_db)):
    """CONSULTA 5: filtro sobre el inventario."""
    with db.cursor() as cur:
        cur.execute(
            """SELECT id_equipo, nombre, marca, stock, disponible
                 FROM v_equipo_disponible
                WHERE stock < %s
                ORDER BY stock ASC""",
            (limite,),
        )
        return cur.fetchall()


@router.get("/historial-cliente/{id_cliente}")
def historial_cliente(id_cliente: int, db=Depends(get_db)):
    """CONSULTA 2: JOIN + filtro por cliente y estado."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT r.id_renta AS folio, r.fecha_inicio, s.estado,
                   e.nombre AS equipo, d.cantidad, d.subtotal, d.fecha_devolucion
              FROM renta r
              JOIN detalle_renta d ON d.id_renta  = r.id_renta
              JOIN equipo        e ON e.id_equipo = d.id_equipo
              JOIN estado_renta  s ON s.id_estado = r.id_estado
             WHERE r.id_cliente = %s
             ORDER BY r.id_renta DESC, d.id_detalle
        """, (id_cliente,))
        return cur.fetchall()


@router.get("/rentas-vencidas")
def rentas_vencidas(db=Depends(get_db)):
    """Rentas activas cuya fecha estimada ya paso y aun tienen equipo fuera."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT r.id_renta, c.nombre_completo AS cliente, c.telefono,
                   r.fecha_fin_estimada,
                   (CURRENT_DATE - r.fecha_fin_estimada) AS dias_de_retraso
              FROM renta r
              JOIN cliente     c ON c.id_cliente = r.id_cliente
              JOIN estado_renta s ON s.id_estado = r.id_estado
             WHERE s.estado IN ('Reservada', 'Activa')
               AND r.fecha_fin_estimada < CURRENT_DATE
             ORDER BY dias_de_retraso DESC
        """)
        return cur.fetchall()


@router.get("/top-clientes")
def top_clientes(db=Depends(get_db)):
    """Clientes que mas han rentado (GROUP BY + ordenamiento)."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT c.id_cliente, c.nombre_completo AS cliente,
                   COUNT(DISTINCT r.id_renta) AS total_rentas,
                   COALESCE(SUM(r.monto_total), 0) AS monto_total
              FROM cliente c
              LEFT JOIN renta r ON r.id_cliente = c.id_cliente
             GROUP BY c.id_cliente
             ORDER BY monto_total DESC
        """)
        return cur.fetchall()


@router.get("/resumen")
def resumen(db=Depends(get_db)):
    """Tarjetas del tablero principal."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT
              (SELECT COUNT(*) FROM cliente WHERE estatus_activo)          AS clientes_activos,
              (SELECT COUNT(*) FROM equipo)                                AS equipos_registrados,
              (SELECT COUNT(*) FROM renta r
                JOIN estado_renta s ON s.id_estado = r.id_estado
               WHERE s.estado = 'Activa')                                  AS rentas_activas,
              (SELECT COUNT(*) FROM detalle_renta
                WHERE fecha_devolucion IS NULL)                            AS lineas_pendientes,
              (SELECT COALESCE(SUM(monto_pagado), 0) FROM pago)            AS ingresos_cobrados,
              (SELECT COALESCE(SUM(monto_total), 0) FROM renta)            AS monto_rentado,
              (SELECT COUNT(*) FROM v_equipo_disponible WHERE disponible <= 0) AS equipos_agotados
        """)
        return cur.fetchone()
