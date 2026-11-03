"""Prueba de humo de la API: recorre el proceso central completo.

Uso (con el backend ya levantado):

    python scripts/prueba_api.py

Opcional: definir API_URL si el backend no esta en localhost:8000
"""
import json
import os
import sys
import urllib.error
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

BASE = os.getenv("API_URL", "http://localhost:8000/api")
fallos = 0


def peticion(metodo: str, ruta: str, cuerpo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(
        BASE + ruta, data=datos, method=metodo,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            texto = r.read().decode()
            return r.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode()
        return e.code, (json.loads(texto) if texto else None)


def revisar(nombre: str, condicion: bool, detalle: str = ""):
    global fallos
    if condicion:
        print(f"  [OK]    {nombre}")
    else:
        fallos += 1
        print(f"  [FALLA] {nombre}  {detalle}")


print("1. Conexion")
codigo, salud = peticion("GET", "/salud")
revisar("GET /salud responde 200", codigo == 200, str(codigo))
revisar("La base responde", salud and salud.get("estado") == "ok", str(salud))

print("\n2. Inventario")
codigo, equipos = peticion("GET", "/equipos")
revisar("GET /equipos", codigo == 200 and len(equipos) > 0)
objetivo = next((e for e in equipos if e["stock"] >= 3), equipos[0])
antes = objetivo["disponible"]
print(f"  Equipo de prueba: [{objetivo['id_equipo']}] {objetivo['nombre']} "
      f"(stock {objetivo['stock']}, disponible {antes})")

print("\n3. Crear renta (proceso central)")
cuerpo = {
    "id_cliente": 2,
    "fecha_inicio": "2026-11-03",
    "fecha_fin_estimada": "2026-11-06",
    "detalles": [{"id_equipo": objetivo["id_equipo"], "cantidad": 2}],
}
codigo, renta = peticion("POST", "/rentas", cuerpo)
revisar("POST /rentas responde 201", codigo == 201, json.dumps(renta)[:200])

if codigo == 201:
    esperado = float(objetivo["precio_renta_diario"]) * 2 * 3
    revisar("Calculo del subtotal (precio x 2 x 3 dias)",
            abs(float(renta["monto_total"]) - esperado) < 0.01,
            f"monto={renta['monto_total']} esperado={esperado}")
    revisar("La renta trae sus detalles", len(renta["detalles"]) == 1)
    revisar("El estado inicial es Activa", renta["estado"] == "Activa", renta["estado"])

    _, despues = peticion("GET", f"/equipos/{objetivo['id_equipo']}")
    revisar("Disponibilidad baja en 2 unidades",
            despues["disponible"] == antes - 2,
            f"{antes} -> {despues['disponible']}")

    print("\n4. Validacion de stock")
    codigo, error = peticion("POST", "/rentas", {
        "id_cliente": 2,
        "fecha_inicio": "2026-11-03",
        "fecha_fin_estimada": "2026-11-04",
        "detalles": [{"id_equipo": objetivo["id_equipo"], "cantidad": 999}],
    })
    revisar("Rechaza rentar mas de lo disponible (409)", codigo == 409, str(codigo))
    revisar("El mensaje explica el motivo",
            error and "insuficiente" in error.get("detail", "").lower(),
            str(error))

    print("\n5. Pago invalido")
    codigo, error = peticion("POST", f"/rentas/{renta['id_renta']}/pagos", {
        "monto_pagado": float(renta["monto_total"]) + 500,
        "metodo_pago": "Tarjeta",
    })
    revisar("Rechaza pagos mayores al total (409)", codigo == 409, str(codigo))

    print("\n6. Devolucion")
    codigo, devuelta = peticion("POST", f"/rentas/{renta['id_renta']}/devoluciones", {})
    revisar("POST devoluciones responde 200", codigo == 200, str(codigo))
    revisar("La renta queda Finalizada",
            codigo == 200 and devuelta["estado"] == "Finalizada",
            devuelta and devuelta["estado"])
    revisar("Ya no hay lineas pendientes",
            codigo == 200 and devuelta["lineas_pendientes"] == 0)

    _, final = peticion("GET", f"/equipos/{objetivo['id_equipo']}")
    revisar("Disponibilidad vuelve a su valor original",
            final["disponible"] == antes, f"esperado {antes}, obtenido {final['disponible']}")

    print("\n7. Reportes")
    for ruta in ["/reportes/pendientes-devolucion", "/reportes/ingresos-por-categoria",
                 "/reportes/rentas-por-estado", "/reportes/inventario-bajo",
                 "/reportes/rentas-vencidas", "/reportes/top-clientes",
                 "/reportes/resumen"]:
        codigo, _ = peticion("GET", ruta)
        revisar(f"GET {ruta}", codigo == 200, str(codigo))

    print("\n8. Limpieza")
    codigo, _ = peticion("DELETE", f"/rentas/{renta['id_renta']}")
    revisar("Se elimina la renta de prueba", codigo == 200, str(codigo))

print("\n" + "=" * 55)
if fallos:
    print(f"RESULTADO: {fallos} prueba(s) con falla")
    sys.exit(1)
print("RESULTADO: todas las pruebas pasaron")
