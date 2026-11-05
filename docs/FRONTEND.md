# Guía del frontend

El sitio es **HTML + CSS + Bootstrap 5 + JavaScript sin frameworks**. No hay
`npm`, ni compilación, ni bundler: los archivos se abren tal cual. Esa fue una
decisión deliberada para que cualquiera del equipo (y el profesor) pueda leer el
código y para que el diseño se pueda cambiar sin tocar el backend.

```
frontend/
├── index.html            Panel general (métricas y últimos movimientos)
├── clientes.html         CRUD de clientes + historial
├── equipos.html          Inventario + categorías
├── rentas.html           Proceso central: renta, pagos y devoluciones
├── reportes.html         7 reportes con JOIN / filtros / GROUP BY
└── assets/
    ├── css/estilos.css   Identidad visual (lo que se personaliza)
    └── js/
        ├── api.js        Cliente HTTP: todos los endpoints en un solo lugar
        ├── comun.js      Navbar, footer, toasts, formatos y helpers
        └── paginas/      Un archivo por pantalla
            ├── inicio.js
            ├── clientes.js
            ├── equipos.js
            ├── rentas.js
            └── reportes.js
```

---

## Cómo abrirlo

### Opción recomendada: con el backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Abre <http://localhost:8000/>. FastAPI sirve la carpeta `frontend/`, así que el
sitio y la API comparten origen (`/api`) y no hay problemas de CORS.

### Opción para maquetar: Live Server

Si solo vas a tocar HTML/CSS, puedes abrir `frontend/index.html` con la extensión
**Live Server** (puerto 5500). `api.js` detecta ese caso y apunta a
`http://localhost:8000/api`, así que igual necesitas el backend corriendo si
quieres datos reales.

> `api.js` decide la URL sola:
>
> | Cómo abres el sitio | URL de la API |
> |---|---|
> | Servido por FastAPI (8000) | `/api` |
> | Live Server (5500 / 5501 / 8080) | `http://localhost:8000/api` |
> | Archivo local (`file://`) | `http://localhost:8000/api` |

---

## Reglas de oro

1. **El navegador no calcula dinero ni valida reglas de negocio.** El precio, el
   total, el stock disponible y los estados los decide PostgreSQL. El front solo
   pinta lo que devuelve la API. Por eso el formulario de renta manda únicamente
   `id_equipo` y `cantidad`.
2. **Nunca metas datos de la base directo en `innerHTML`.** Usa
   `Comun.escapar(texto)` (ya se hace en todas las pantallas). Evita inyección de
   HTML si alguien registra un cliente llamado `<script>…</script>`.
3. **Los errores se muestran tal como los manda el backend.** `Api` lanza un
   `Error` con el mensaje en español; `Comun.error(e)` lo muestra en un toast.
   No hay que inventar mensajes por pantalla.
4. **La disponibilidad no se guarda en ninguna columna.** Sale de la vista
   `v_equipo_disponible`; si algo se ve raro, el problema está en la base, no en
   el front.

---

## La capa compartida

### `api.js` — un método por endpoint

```js
await Api.salud();
await Api.clientes.listar("ana", true);        // q, activos
await Api.equipos.listar({ id_categoria: 2 });
await Api.rentas.crear({ id_cliente, fecha_inicio, fecha_fin_estimada, estado, detalles });
await Api.rentas.pagar(7, { monto_pagado: 250, metodo_pago: "Tarjeta" });
await Api.rentas.devolver(7, { id_detalles: [12] });
await Api.reportes.ingresosPorCategoria();
```

Los nombres completos están en `docs/API.md`. Para una ruta nueva, agrega el
método al objeto correspondiente; no llames `fetch` desde las páginas.

### `comun.js` — todo lo repetido

| Función | Para qué |
|---|---|
| `Comun.montarLayout()` | Inyecta navbar y footer (se ejecuta sola) |
| `Comun.toast(msg, tipo)` | Aviso flotante (`success`, `danger`, `warning`, `info`) |
| `Comun.error(e)` | Toast rojo con el mensaje del backend + `console.error` |
| `Comun.confirmar({...})` | Diálogo de confirmación que devuelve `true`/`false` |
| `Comun.dinero(n)` | `$3,400.00` |
| `Comun.fecha(iso)` | `05/11/2026` |
| `Comun.fechaHora(iso)` | Fecha y hora local |
| `Comun.hoyISO()` / `sumarDias()` / `diasEntre()` | Fechas para el formulario de renta |
| `Comun.escapar(texto)` | Escapa HTML antes de inyectarlo |
| `Comun.badgeEstado(estado)` | Badge con el color de cada estado |
| `Comun.filaCargando()` / `filaVacia()` | Filas estándar para las tablas |
| `Comun.debounce(fn, ms)` | Retrasa la búsqueda mientras se escribe |
| `Comun.llenarSelect(select, opciones)` | Rellena un `<select>` conservando el valor |

Cada página se identifica con `<body data-pagina="clientes">`: así el navbar
marca la pestaña activa.

---

## Dónde tocar el diseño

Casi todo el estilo vive en `assets/css/estilos.css`. Las variables del inicio
controlan la identidad visual:

```css
:root {
  --marca: #6d28d9;        /* color principal (navbar, botones, barras) */
  --marca-oscura: #4c1d95; /* degradado del navbar */
  --marca-clara: #ede9fe;  /* fondos suaves y badges */
  --fondo: #f6f5fb;        /* fondo del sitio */
  --borde: #e5e7eb;
  --texto-suave: #6b7280;
  --radio: 0.9rem;         /* redondeo de tarjetas */
}
```

Si cambias `--marca`, cambia todo el sitio de color. Para un cambio más
profundo se puede sobrescribir Bootstrap en ese mismo archivo (se carga después
del CDN).

Clases propias que conviene conocer:

| Clase | Dónde se usa |
|---|---|
| `.navbar-marca` | Barra superior con degradado |
| `.encabezado-pagina` | Título + subtítulo + botones de cada pantalla |
| `.tarjeta-metrica` | Tarjetas de números del panel |
| `.tarjeta-accion` | Accesos rápidos del panel |
| `.tabla-datos` | Tablas de todas las pantallas |
| `.badge-estado`, `.badge-suave` | Etiquetas de estado y categoría |
| `.barra` | Barras horizontales de los reportes (sin librerías) |
| `.resumen-total` | Bloque del total en el carrito de renta |
| `.carrito-vacio` | Estado vacío del carrito |
| `.offcanvas-detalle` | Panel lateral de detalle de renta |
| `.solo-print` y `@media print` | Qué se ve al imprimir reportes |

Para reemplazar el logo o la tipografía: el navbar se genera en `comun.js`
(busca `RentaVisual`), y la fuente se define en `body` dentro de `estilos.css`.

---

## Cómo agregar una pantalla

1. Copia la estructura de `clientes.html` (head, `<div id="app-navbar">`,
   `<main>`, `<div id="app-footer">`, scripts al final).
2. Ponle `data-pagina="mipagina"` al `<body>` y agrega la entrada en el arreglo
   `PAGINAS` de `comun.js` para que aparezca en el menú.
3. Crea `assets/js/paginas/mipagina.js` y agrega los métodos que falten en
   `api.js`.
4. Reutiliza `Comun.filaCargando()`, `Comun.filaVacia()`, `Comun.toast()` y
   `Comun.confirmar()`: así se ve y se comporta igual que el resto.

---

## Qué consume cada pantalla

| Pantalla | Endpoints principales |
|---|---|
| Panel (`index.html`) | `/salud`, `/reportes/resumen`, `/rentas`, `/equipos`, `/reportes/rentas-vencidas` |
| Clientes | `/clientes`, `/reportes/historial-cliente/{id}` |
| Equipos | `/equipos`, `/categorias` |
| Rentas | `/rentas`, `/rentas/{id}`, `/rentas/{id}/pagos`, `/rentas/{id}/devoluciones`, `/estados` |
| Reportes | `/reportes/*` |

Enlaces profundos útiles: `rentas.html?nueva=1`, `rentas.html?detalle=7`,
`reportes.html#vencidas`, `reportes.html#inventario`.

---

## Problemas comunes

| Síntoma | Causa / solución |
|---|---|
| "No se pudo conectar con el servidor" | El backend no está corriendo en el puerto 8000 |
| Funciona en `localhost:8000` pero no en Live Server | Falta el backend, o el puerto no es 5500/5501/8080: ajústalo en `api.js` |
| Los cambios de CSS no se ven | Recarga forzada (`Ctrl + F5`); el navegador cachea |
| Un `select` aparece vacío | La petición que lo llena falló: mira la consola y el toast de error |
| Un reporte dice "No se pudo cargar" | Revisa que el backend siga vivo y que la base tenga el esquema actualizado |
| Al imprimir salen botones | Falta la clase `no-print` en el elemento nuevo |

---

## Antes de entregar

- [ ] El sitio abre en `http://localhost:8000/` con la base real.
- [ ] La consola del navegador no muestra errores en ninguna de las 5 pantallas.
- [ ] Se puede crear una renta, abonar, devolver todo y verla finalizada.
- [ ] Los 7 reportes muestran datos y el botón Imprimir genera una hoja limpia.
- [ ] El diseño se ve bien en celular (el navbar colapsa y las tablas hacen scroll).
- [ ] No hay datos de prueba inventados en la base (`clientes`, `rentas`).
