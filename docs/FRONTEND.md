# Guía del frontend

El sitio es **HTML + CSS + Bootstrap 5 + JavaScript sin frameworks**. No hay
`npm`, ni compilación, ni bundler: los archivos se abren tal cual. Esa fue una
decisión deliberada para que cualquiera del equipo (y el profesor) pueda leer el
código y para que el diseño se pueda cambiar sin tocar el backend.

```
frontend/
├── login.html            Iniciar sesión / registrarse (pantalla completa)
├── index.html            Panel general (métricas, avisos y actividad)
├── solicitudes.html      Bandeja de solicitudes: aprobar / rechazar (admin)
├── clientes.html         CRUD de clientes + historial + acceso al portal
├── equipos.html          Inventario + categorías
├── rentas.html           Proceso central: renta, pagos y devoluciones
├── reportes.html         7 reportes con JOIN / filtros / GROUP BY
├── actividad.html        Bitácora de auditoría (admin)
├── portal.html           Portal del cliente: catálogo, carrito e historial
└── assets/
    ├── css/estilos.css   Identidad visual (lo que se personaliza)
    └── js/
        ├── api.js        Cliente HTTP: todos los endpoints en un solo lugar
        ├── comun.js      Sesión, navbar por rol, guards, toasts y helpers
        └── paginas/      Un archivo por pantalla
            ├── login.js
            ├── inicio.js
            ├── solicitudes.js
            ├── clientes.js
            ├── equipos.js
            ├── rentas.js
            ├── reportes.js
            ├── actividad.js
            └── portal.js
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

## Sesión y roles

La sesión vive en una cookie `HttpOnly` (`rv_sesion`). El front **no** guarda
tokens ni usuarios en `localStorage`: al cargar cualquier página, `comun.js`
pregunta a `/api/auth/yo` quién eres.

```js
Comun.listo.then((sesion) => {
  // sesion = { id_usuario, nombre, rol, id_cliente, ... } o null (redirigiendo)
  if (!sesion) return;
  // ...
});
```

- Si no hay sesión y la página no es `login.html`, redirige a `login.html`.
- `login.html` manda al admin a `index.html` y al cliente a `portal.html`.
- El navbar se arma según `sesion.rol`; el cliente no ve los enlaces de admin
  ni el enlace a `/docs`.
- **Los permisos reales están en FastAPI.** Ocultar un botón es solo
  presentación; si alguien llama la API con el rol equivocado, recibe 403.

### Guards declarativos

| Atributo en `<body>` | Efecto |
|---|---|
| `data-solo-admin="true"` | Si el rol no es `admin`, redirige a `portal.html` |
| `data-solo-cliente="true"` | Si el rol no es `cliente`, redirige a `index.html` |

Así se declaran las pantallas de admin y el portal del cliente. Para una página
nueva, agrega el atributo que corresponda.

### Sesión en `api.js`

`Api` envía `credentials: "include"` en todas las llamadas. Si el backend
responde 401 y no estás en `login.html`, limpia y redirige al login. No hay que
manejar el 401 en cada pantalla.

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
| `Comun.listo` | Promesa que resuelve con la sesión (`/auth/yo`) o `null` si redirige |
| `Comun.esAdmin()` / `Comun.esCliente()` | Rol de la sesión actual |
| `Comun.rutaInicio()` | `index.html` para admin, `portal.html` para cliente |
| `Comun.actualizarBadge()` | Refresca el contador de solicitudes del navbar |
| `Comun.abrirPassword()` | Abre el modal para cambiar la contraseña |
| `Comun.toast(msg, tipo)` | Aviso flotante (`success`, `danger`, `warning`, `info`) |
| `Comun.error(e)` | Toast rojo con el mensaje del backend + `console.error` |
| `Comun.confirmar({...})` | Diálogo de confirmación que devuelve `true`/`false` |
| `Comun.dinero(n)` | `$3,400.00` |
| `Comun.fecha(iso)` | `05/11/2026` |
| `Comun.fechaHora(iso)` | Fecha y hora local |
| `Comun.hoyISO()` / `sumarDias()` / `diasEntre()` | Fechas para el formulario de renta |
| `Comun.escapar(texto)` | Escapa HTML antes de inyectarlo |
| `Comun.etiquetaRol(rol)` | `admin` → `Administrador`, `cliente` → `Cliente` |
| `Comun.badgeEstado(estado)` | Badge con el color de cada estado (incluye `Solicitada`) |
| `Comun.filaCargando()` / `filaVacia()` | Filas estándar para las tablas |
| `Comun.debounce(fn, ms)` | Retrasa la búsqueda mientras se escribe |
| `Comun.llenarSelect(select, opciones)` | Rellena un `<select>` conservando el valor |

Cada página se identifica con `<body data-pagina="clientes">`: así el navbar
marca la pestaña activa. Para las pantallas exclusivas se agrega
`data-solo-admin` o `data-solo-cliente`.

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
| `.auth-*` | Pantalla de login a dos columnas (marca + formulario) |
| `.encabezado-pagina` | Título + subtítulo + botones de cada pantalla |
| `.tarjeta-metrica` | Tarjetas de números del panel |
| `.tarjeta-accion` | Accesos rápidos del panel |
| `.equipo-card` | Tarjeta de equipo del catálogo del cliente |
| `.icono-categoria` | Círculo con el icono de cada categoría |
| `.tabla-datos` | Tablas de todas las pantallas |
| `.fila-pendiente` | Resalta solicitudes por aprobar en tablas |
| `.tarjeta-solicitud` | Tarjeta de una solicitud en el portal del cliente |
| `.timeline` | Línea de seguimiento (solicitud → aprobación → cierre) |
| `.feed`, `.feed-item`, `.feed-icono` | Bitácora de actividad del panel y de `actividad.html` |
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
2. Ponle `data-pagina="mipagina"` al `<body>`, el guard que corresponda
   (`data-solo-admin="true"` o `data-solo-cliente="true"`) y agrega la entrada
   en el arreglo `PAGINAS_ADMIN` o `PAGINAS_CLIENTE` de `comun.js` para que
   aparezca en el menú.
3. Crea `assets/js/paginas/mipagina.js` y agrega los métodos que falten en
   `api.js`. Si necesitas la sesión, espera `Comun.listo.then(...)`.
4. Reutiliza `Comun.filaCargando()`, `Comun.filaVacia()`, `Comun.toast()` y
   `Comun.confirmar()`: así se ve y se comporta igual que el resto.

---

## Qué consume cada pantalla

| Pantalla | Endpoints principales |
|---|---|
| Login (`login.html`) | `/auth/login`, `/auth/registro`, `/auth/yo` |
| Panel (`index.html`) | `/salud`, `/reportes/resumen`, `/rentas`, `/equipos`, `/reportes/rentas-vencidas`, `/rentas/pendientes/conteo`, `/auditoria` |
| Solicitudes (`solicitudes.html`) | `/rentas`, `/rentas/{id}`, `/rentas/{id}/aprobar`, `/rentas/{id}/rechazar` |
| Clientes | `/clientes`, `/clientes/{id}/acceso`, `/reportes/historial-cliente/{id}` |
| Equipos | `/equipos`, `/categorias` |
| Rentas | `/rentas`, `/rentas/{id}`, `/rentas/{id}/pagos`, `/rentas/{id}/devoluciones`, `/rentas/{id}/aprobar`, `/estados` |
| Portal (`portal.html`) | `/equipos`, `/categorias`, `/rentas`, `/rentas/{id}`, `/rentas/{id}/cancelar` |
| Actividad (`actividad.html`) | `/auditoria`, `/auditoria/acciones` |
| Reportes | `/reportes/*` |

Enlaces profundos útiles: `rentas.html?nueva=1`, `rentas.html?detalle=7`,
`reportes.html#vencidas`, `reportes.html#inventario`,
`portal.html#mis-solicitudes`.

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

- [ ] El sitio abre en `http://localhost:8000/` y redirige al login sin sesión.
- [ ] Se puede entrar como admin y como cliente con las cuentas demo.
- [ ] El cliente solo ve su portal; no puede abrir `clientes.html` ni `reportes.html`.
- [ ] Un cliente envía una solicitud, el admin la aprueba y el stock baja.
- [ ] El cliente cancela una solicitud pendiente y el admin ve el cambio.
- [ ] La consola del navegador no muestra errores en ninguna pantalla.
- [ ] Se puede crear una renta, abonar, devolver todo y verla finalizada.
- [ ] Los 7 reportes muestran datos y el botón Imprimir genera una hoja limpia.
- [ ] El diseño se ve bien en celular (el navbar colapsa y las tablas hacen scroll).
- [ ] No hay datos de prueba inventados en la base (`clientes`, `rentas`).
