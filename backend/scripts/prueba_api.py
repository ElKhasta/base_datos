"""Prueba de humo de la API con login, dos roles y flujo de solicitudes.

Uso (con el backend ya levantado y el venv activo):

    python scripts/prueba_api.py

Opcional: definir API_URL si el backend no esta en localhost:8000.

Que hace:
    - verifica conexion, login de admin y de cliente;
    - comprueba permisos (403/404) con cada rol;
    - el cliente crea una solicitud y comprueba que NO aparta stock;
    - el admin la aprueba y comprueba que SÍ aparta stock;
    - cancella y borra la renta de prueba, devolviendo el inventario a su valor.

No borra rentas ni clientes reales: solo crea una renta temporal y la limpia.
Las entradas nuevas en la bitacora de auditoria quedan (son append-only).
"""
import http.cookiejar
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

RAIZ = Path(__file__).resolve().parents[2]
if load_dotenv:
    load_dotenv(RAIZ / "backend" / ".env")

BASE = os.getenv("API_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@rentavisual.mx")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin123!")
CLIENTE_EMAIL = os.getenv("DEMO_CLIENTE_EMAIL", "luis@rentavisual.mx")
CLIENTE_PASSWORD = os.getenv("DEMO_CLIENTE_PASSWORD", "Cliente123!")

fallos = 0
id_renta = None


def crear_opener():
    """Cada opener guarda su propia cookie: simula un navegador por rol."""
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


anon = crear_opener()
admin = crear_opener()
cliente = crear_opener()


def peticion(opener, metodo, ruta, cuerpo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(
        BASE + ruta, data=datos, method=metodo,
        headers={"Content-Type": "application/json"},
    )
    try:
        with opener.open(req, timeout=15) as r:
            texto = r.read().decode()
            return r.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode()
        try:
            return e.code, json.loads(texto)
        except json.JSONDecodeError:
            return e.code, {"detail": texto[:200]}


def revisar(nombre: str, condicion: bool, detalle: str = "") -> bool:
    global fallos
    if condicion:
        print(f"  [OK]    {nombre}")
    else:
        fallos += 1
        print(f"  [FALLA] {nombre}  {detalle}")
    return condicion


def login(opener, email, password):
    return peticion(opener, "POST", "/auth/login", {"email": email, "password": password})


print("1. Conexion y sesion")
codigo, salud = peticion(anon, "GET", "/salud")
revisar("GET /salud responde 200", codigo == 200, str(codigo))
revisar("La base responde", bool(salud) and salud.get("estado") == "ok", str(salud))
codigo, _ = peticion(anon, "GET", "/auth/yo")
revisar("Sin sesion responde 401", codigo == 401, str(codigo))

codigo, perfil_admin = login(admin, ADMIN_EMAIL, ADMIN_PASSWORD)
revisar("Login admin responde 200", codigo == 200, str(perfil_admin))
revisar("El perfil admin tiene rol 'admin'",
        codigo == 200 and perfil_admin.get("rol") == "admin", str(perfil_admin))

codigo, perfil_cliente = login(cliente, CLIENTE_EMAIL, CLIENTE_PASSWORD)
revisar("Login cliente responde 200", codigo == 200, str(perfil_cliente))
revisar("El cliente esta ligado a un id_cliente",
        codigo == 200 and perfil_cliente.get("id_cliente") is not None, str(perfil_cliente))

print("\n2. Permisos por rol")
codigo, _ = peticion(cliente, "GET", "/clientes")
revisar("Cliente NO puede listar clientes (403)", codigo == 403, str(codigo))
codigo, _ = peticion(cliente, "GET", "/auditoria")
revisar("Cliente NO puede ver la bitacora (403)", codigo == 403, str(codigo))
codigo, _ = peticion(cliente, "GET", "/rentas/9")
revisar("Cliente NO ve renta ajena (404)", codigo == 404, str(codigo))

print("\n3. Inventario antes de la solicitud")
codigo, equipos = peticion(admin, "GET", "/equipos")
if not revisar("GET /equipos", codigo == 200 and len(equipos) > 0, str(codigo)):
    print("RESULTADO: no se pudo leer el inventario")
    sys.exit(1)
objetivo = max(equipos, key=lambda e: e["disponible"])
id_equipo = objetivo["id_equipo"]
antes = objetivo["disponible"]
print(f"  Equipo de prueba: [{id_equipo}] {objetivo['nombre']} "
      f"(stock {objetivo['stock']}, disponible {antes})")
if antes < 2:
    print("RESULTADO: no hay unidades disponibles para la prueba")
    sys.exit(1)

try:
    print("\n4. El cliente envia una solicitud")
    codigo, solicitud = peticion(cliente, "POST", "/rentas", {
        # El servidor debe ignorar estos dos campos por ser cliente.
        "id_cliente": 9999,
        "estado": "Activa",
        "fecha_inicio": "2026-11-18",
        "fecha_fin_estimada": "2026-11-20",
        "detalles": [{"id_equipo": id_equipo, "cantidad": 2}],
    })
    if not revisar("POST /rentas responde 201", codigo == 201, str(solicitud)[:200]):
        raise RuntimeError("no se pudo crear la solicitud")
    id_renta = solicitud["id_renta"]
    revisar("Nace como 'Solicitada' aunque pidiera 'Activa'",
            solicitud["estado"] == "Solicitada", solicitud["estado"])
    revisar("Se crea a nombre del cliente de la sesion",
            solicitud["id_cliente"] == perfil_cliente["id_cliente"],
            f"{solicitud['id_cliente']} vs {perfil_cliente['id_cliente']}")
    revisar("El total se calcula en el servidor",
            float(solicitud["monto_total"]) > 0, solicitud["monto_total"])

    _, despues = peticion(admin, "GET", f"/equipos/{id_equipo}")
    revisar("La solicitud NO aparta inventario", despues["disponible"] == antes,
            f"{antes} -> {despues['disponible']}")

    codigo, _ = peticion(admin, "PATCH", f"/rentas/{id_renta}/estado", {"estado": "Reservada"})
    revisar("El cambio generico NO puede aprobar (409)", codigo == 409, str(codigo))
    codigo, _ = peticion(admin, "POST", f"/rentas/{id_renta}/pagos", {
        "monto_pagado": 100, "metodo_pago": "Efectivo",
    })
    revisar("No se puede cobrar una solicitud (409)", codigo == 409, str(codigo))

    print("\n5. El admin aprueba")
    codigo, aprobada = peticion(admin, "POST", f"/rentas/{id_renta}/aprobar",
                                {"estado": "Reservada"})
    revisar("POST /aprobar responde 200", codigo == 200, str(aprobada)[:200])
    if revisar("Queda como 'Reservada'",
               codigo == 200 and aprobada["estado"] == "Reservada",
               aprobada.get("estado") if isinstance(aprobada, dict) else str(aprobada)):
        revisar("Queda registrado el aprobador",
                aprobada.get("aprobador") is not None, str(aprobada.get("aprobador")))

    _, ocupado = peticion(admin, "GET", f"/equipos/{id_equipo}")
    revisar("Al aprobar SÍ baja la disponibilidad en 2",
            ocupado["disponible"] == antes - 2,
            f"{antes} -> {ocupado['disponible']}")

    codigo, _ = peticion(cliente, "POST", f"/rentas/{id_renta}/cancelar")
    revisar("El cliente YA NO puede cancelar una renta aprobada (409)",
            codigo == 409, str(codigo))

    codigo, bitacora = peticion(admin, "GET", "/auditoria?accion=aprobar_solicitud&limite=5")
    revisar("La aprobacion queda en la bitacora",
            codigo == 200 and any(a["id_entidad"] == id_renta
                                  for a in bitacora["resultados"]), str(bitacora)[:200])

    print("\n6. Reportes (solo admin)")
    for ruta in ["/reportes/resumen", "/reportes/pendientes-devolucion",
                 "/reportes/ingresos-por-categoria", "/reportes/rentas-por-estado",
                 "/reportes/inventario-bajo", "/reportes/rentas-vencidas",
                 "/reportes/top-clientes"]:
        codigo, _ = peticion(admin, "GET", ruta)
        revisar(f"GET {ruta}", codigo == 200, str(codigo))

finally:
    print("\n7. Limpieza")
    if id_renta is not None:
        codigo, _ = peticion(admin, "POST", f"/rentas/{id_renta}/cancelar")
        revisar("Se cancela la renta de prueba", codigo in (200, 409), str(codigo))
        codigo, _ = peticion(admin, "DELETE", f"/rentas/{id_renta}")
        revisar("Se elimina la renta de prueba", codigo == 200, str(codigo))
    _, final = peticion(admin, "GET", f"/equipos/{id_equipo}")
    revisar("El inventario vuelve a su valor original", final["disponible"] == antes,
            f"esperado {antes}, obtenido {final['disponible']}")
    for nombre, opener in (("admin", admin), ("cliente", cliente)):
        codigo, _ = peticion(opener, "POST", "/auth/logout")
        revisar(f"Logout {nombre}", codigo == 200, str(codigo))

print("\n" + "=" * 55)
if fallos:
    print(f"RESULTADO: {fallos} prueba(s) con falla")
    sys.exit(1)
print("RESULTADO: todas las pruebas pasaron")
