# Contrato de la API

Base: `http://localhost:8000/api`
Formato: JSON. Documentación interactiva: `http://localhost:8000/docs`

Los errores siempre regresan así:

```json
{ "detail": "Stock insuficiente de 'Proyector 4K': se pidieron 3 y solo hay 2 disponibles" }
```

| Código | Significado |
|---|---|
| 200 / 201 | OK |
| 400 | Datos inválidos (regla de negocio o CHECK) |
| 401 | Sin sesión, cookie inválida/expirada o contraseña incorrecta |
| 403 | Sesión válida pero el rol no tiene permiso |
| 404 | El registro no existe (o el cliente no puede verlo) |
| 409 | Conflicto (stock, duplicado, cliente inactivo, pago excedido) |
| 422 | Error de validación de campos (Pydantic) |
| 429 | Demasiados intentos de login fallidos |

> **Sesión:** todas las rutas (salvo `/auth/login`, `/auth/registro` y `/salud`)
> requieren la cookie `rv_sesion`. En JavaScript hay que enviar
> `credentials: "include"`; `api.js` ya lo hace por ti. La cookie es `HttpOnly`,
> así que el navegador no puede leerla desde el código.

---

## Autenticación

### `POST /auth/login`
```json
{ "email": "admin@rentavisual.mx", "password": "Admin123!" }
```
Responde el perfil y **crea la cookie de sesión**:
```json
{
  "id_usuario": 1,
  "email": "admin@rentavisual.mx",
  "nombre": "Administrador",
  "rol": "admin",
  "id_cliente": null,
  "cliente": null,
  "session_horas": 8
}
```
- 401 si el correo o la contraseña no coinciden.
- 403 si la cuenta está desactivada o el cliente está dado de baja.
- 429 tras 5 fallos en un minuto (por IP + correo).

### `POST /auth/registro` (público)
```json
{
  "nombre": "Ana López",
  "email": "ana@correo.com",
  "telefono": "5512345678",
  "password": "MiClave123"
}
```
Crea la ficha en `cliente` **y** la cuenta en `usuario` (rol `cliente`) en una
sola transacción, y deja la sesión iniciada. 409 si el correo ya existe como
cliente o como usuario: en ese caso el admin otorga el acceso desde el panel.

### `POST /auth/logout`
Borra la cookie. Responde `{ "ok": true }`. No requiere cuerpo.

### `GET /auth/yo`
Devuelve el perfil de la sesión actual. 401 si no hay sesión. Es lo que usa el
front para decidir qué navbar pintar.

### `PUT /auth/password`
```json
{ "actual": "ClaveVieja1", "nueva": "ClaveNueva1" }
```
401 si la contraseña actual no coincide; 400 si la nueva es igual a la actual.

---

## Sistema

### `GET /salud`
```json
{ "estado": "ok", "base": "renta_equipos", "version": "PostgreSQL 18..." }
```

### `GET /estados`
```json
[ { "id_estado": 1, "estado": "Reservada" }, ... ]
```

---

## Categorías

| Método | Ruta | Cuerpo |
|---|---|---|
| GET | `/categorias` | — |
| GET | `/categorias/{id}` | — |
| POST | `/categorias` | `{ "nombre_categoria": "Audio", "descripcion": "..." }` |
| PUT | `/categorias/{id}` | igual que POST |
| DELETE | `/categorias/{id}` | — |

```json
{ "id_categoria": 1, "nombre_categoria": "Audio", "descripcion": "Micrófonos..." }
```

---

## Clientes

> Todas estas rutas son **solo para administradores** (`requiere_admin`).

| Método | Ruta | Notas |
|---|---|---|
| GET | `/clientes?q=texto&activos=true` | `q` busca en nombre, teléfono y email |
| GET | `/clientes/{id}` | — |
| POST | `/clientes` | — |
| PUT | `/clientes/{id}` | — |
| DELETE | `/clientes/{id}` | **Baja lógica**: pone `estatus_activo = false` |
| POST | `/clientes/{id}/acceso` | Crea o reactiva la cuenta del portal |
| DELETE | `/clientes/{id}/acceso` | Revoca el acceso (`usuario.activo = false`) |

```json
{
  "nombre_completo": "Luis Ramírez",
  "telefono": "5512345678",
  "email": "luis@email.com",
  "estatus_activo": true
}
```

Respuesta (incluye si tiene cuenta de portal):
```json
{
  "id_cliente": 1,
  "nombre_completo": "Luis Ramírez",
  "telefono": "5512345678",
  "email": "luis@email.com",
  "estatus_activo": true,
  "fecha_alta": "2026-11-03",
  "tiene_acceso": true,
  "email_acceso": "luis@rentavisual.mx",
  "acceso_activo": true
}
```

### `POST /clientes/{id}/acceso`
```json
{
  "email": "luis@rentavisual.mx",
  "password": "Cliente123!",
  "nombre": "Luis Ramírez"
}
```
- Crea la cuenta si el cliente no tenía, o actualiza correo/contraseña y la
  reactiva si estaba revocada.
- 409 si otro usuario ya usa ese correo.
- `nombre` es opcional: si se omite, se usa el nombre del cliente.

### `DELETE /clientes/{id}/acceso`
Desactiva la cuenta sin borrarla: el cliente conserva historial y la cuenta se
puede reactivar después con `POST /clientes/{id}/acceso`.

---

## Equipos

| Método | Ruta | Notas |
|---|---|---|
| GET | `/equipos?q=&id_categoria=&disponibles=true` | `disponibles=true` filtra los que tienen unidades libres |
| GET | `/equipos/{id}` | — |
| POST | `/equipos` | — |
| PUT | `/equipos/{id}` | — |
| DELETE | `/equipos/{id}` | Falla con 409 si tiene rentas asociadas |

```json
{
  "id_categoria": 1,
  "nombre": "Micrófono Inalámbrico",
  "marca": "Shure",
  "precio_renta_diario": 250.00,
  "stock": 10
}
```

Respuesta (incluye columnas calculadas):
```json
{
  "id_equipo": 1,
  "nombre": "Micrófono Inalámbrico",
  "marca": "Shure",
  "id_categoria": 1,
  "nombre_categoria": "Audio",
  "precio_renta_diario": "250.00",
  "stock": 10,
  "unidades_rentadas": 2,
  "disponible": 8
}
```

---

## Rentas (proceso central)

> **Visibilidad:** el cliente solo ve sus propias rentas. `GET /rentas` filtra por
> `usuario.id_cliente` en el servidor y `GET /rentas/{id}` responde **404** si la
> renta es de otro cliente (no 403, para no revelar que existe).

### `GET /rentas?estado=Activa&id_cliente=1`

```json
{
  "id_renta": 1,
  "id_cliente": 1,
  "cliente": "Luis Ramírez",
  "telefono": "5512345678",
  "id_estado": 2,
  "estado": "Activa",
  "fecha_registro": "2026-11-03T10:15:00-06:00",
  "fecha_inicio": "2026-11-03",
  "fecha_fin_estimada": "2026-11-05",
  "monto_total": "3400.00",
  "pagado": "3400.00",
  "lineas_pendientes": 2,
  "solicitante": "Luis Ramírez",
  "aprobador": "Administrador",
  "fecha_aprobacion": "2026-11-03T10:16:00-06:00",
  "motivo_rechazo": null
}
```

`id_cliente` solo lo puede usar el admin; para un cliente se ignora.

### `GET /rentas/pendientes/conteo` (solo admin)
```json
{ "pendientes": 2 }
```
Es el número del badge de la bandeja de solicitudes.

### `GET /rentas/{id}`

Igual que arriba **más** los arreglos `detalles` y `pagos`:

```json
{
  "...": "...",
  "detalles": [
    {
      "id_detalle": 1,
      "id_equipo": 1,
      "equipo": "Micrófono Inalámbrico",
      "marca": "Shure",
      "cantidad": 2,
      "precio_unitario": "250.00",
      "subtotal": "1000.00",
      "fecha_devolucion": null
    }
  ],
  "pagos": [
    { "id_pago": 1, "monto_pagado": "3400.00", "fecha_pago": "...", "metodo_pago": "Tarjeta" }
  ]
}
```

### `POST /rentas` ← **crear renta o solicitud**

```json
{
  "id_cliente": 1,
  "fecha_inicio": "2026-11-03",
  "fecha_fin_estimada": "2026-11-05",
  "estado": "Activa",
  "detalles": [
    { "id_equipo": 1, "cantidad": 2 },
    { "id_equipo": 3, "cantidad": 1 }
  ]
}
```

- **Rol cliente:** el servidor ignora `id_cliente` y `estado`; siempre usa el
  cliente de la sesión y crea la renta como `Solicitada`. **No aparta stock.**
- **Rol admin:** puede crearla como `Solicitada`, `Reservada` o `Activa`.
- **El precio NO se envía**: lo lee el servidor de la tabla `equipo`.
- `subtotal = cantidad × precio_diario × días`, con mínimo 1 día.
- Si el mismo equipo se repite, las cantidades se suman.
- Devuelve la renta completa (201).

### `POST /rentas/{id}/aprobar` (solo admin)
```json
{ "estado": "Reservada" }
```
`estado`: `Reservada` (apartar) o `Activa` (entregar de inmediato), por defecto
`Reservada`.

- Solo aplica a rentas en estado `Solicitada` (409 en cualquier otro).
- **Revalida el stock en ese instante**; si ya no alcanza, responde 409 y no
  cambia nada.
- Guarda quién aprobó y cuándo, y deja registro en `auditoria`.

### `POST /rentas/{id}/rechazar` (solo admin)
```json
{ "motivo": "No hay disponibilidad para esas fechas" }
```
Pasa la solicitud a `Cancelada` sin tocar inventario y guarda el motivo, que el
cliente ve en su portal. `motivo` exige entre 3 y 500 caracteres.

### `POST /rentas/{id}/cancelar`
- **Cliente:** solo puede cancelar **sus propias** rentas en estado `Solicitada`.
- **Admin:** puede cancelar rentas `Solicitada`, `Reservada` o `Activa`.
- Cualquier otro estado responde 409.
- No borra la renta: la deja `Cancelada` con su historial.

### `PATCH /rentas/{id}/estado` (solo admin)
```json
{ "estado": "Cancelada" }
```
Valores: `Reservada`, `Activa`, `Finalizada`, `Cancelada`.

> Este cambio es administrativo y **no** revalida stock. Para pasar una
> `Solicitada` a `Reservada`/`Activa` hay que usar `/aprobar`; el backend
> responde 400 si se intenta por aquí.

### `POST /rentas/{id}/devoluciones`
```json
{ "fecha_devolucion": "2026-11-06", "id_detalles": [1, 2] }
```

- Si omites `id_detalles`, devuelve **todas** las líneas pendientes.
- Si omites `fecha_devolucion`, usa la fecha de hoy.
- Cuando ya no queda ninguna pendiente, la renta pasa sola a `Finalizada`.
- Responde 409 si no había nada pendiente.

### `DELETE /rentas/{id}` (solo admin)
Elimina la renta; detalles y pagos se borran en cascada. Al borrar una renta que
ocupaba stock, la vista de disponibilidad se actualiza sola. Si solo quieres
anularla conservando el historial, usa `/cancelar` en lugar de borrar.

---

## Pagos

> Los pagos están bloqueados para rentas en estado `Solicitada` o `Cancelada`
> (409): primero hay que aprobar la solicitud.

### `GET /rentas/{id}/pagos`

### `POST /rentas/{id}/pagos`
```json
{ "monto_pagado": 1500.00, "metodo_pago": "Transferencia" }
```
`metodo_pago`: `Efectivo` | `Tarjeta` | `Transferencia`.
Responde 409 si la suma de pagos supera `monto_total`.

---

## Auditoría (solo admin)

### `GET /auditoria?accion=&entidad=&limite=50&offset=0`
```json
{
  "total": 24,
  "resultados": [
    {
      "id_auditoria": 24,
      "fecha": "2026-11-10T10:25:37-06:00",
      "accion": "aprobar_solicitud",
      "entidad": "renta",
      "id_entidad": 14,
      "detalle": "Solicitud aprobada como Reservada",
      "id_usuario": 1,
      "usuario": "Administrador",
      "usuario_email": "admin@rentavisual.mx",
      "rol": "admin"
    }
  ]
}
```
`limite` va de 1 a 200. La bitácora es append-only desde la aplicación.
`total` cuenta **solo** los eventos que cumplen los filtros de `accion`/`entidad`,
así que `mostrados` vs `total` sirve para paginar sin descuadres.

### `GET /auditoria/acciones`
Lista las acciones distintas registradas, para llenar el filtro del front:
```json
["aprobar_solicitud", "cancelar_renta", "login", "solicitar_renta"]
```

---

## Reportes

| Ruta | Qué devuelve | Técnica SQL |
|---|---|---|
| `/reportes/pendientes-devolucion` | Equipos sin devolver | JOIN múltiple + `IS NULL` |
| `/reportes/ingresos-por-categoria` | Ingresos por categoría | `GROUP BY` + `SUM` |
| `/reportes/rentas-por-estado` | Conteo por estado | `LEFT JOIN` + `COUNT` |
| `/reportes/inventario-bajo?limite=5` | Equipos con stock bajo | Filtro |
| `/reportes/historial-cliente/{id}` | Historial de un cliente | JOIN + filtro |
| `/reportes/rentas-vencidas` | Rentas pasadas de fecha | JOIN + filtro por fecha |
| `/reportes/top-clientes` | Ranking de clientes | `GROUP BY` + orden |
| `/reportes/resumen` | Tarjetas del tablero | Subconsultas |

### `GET /reportes/resumen`
```json
{
  "clientes_activos": 3,
  "equipos_registrados": 4,
  "rentas_activas": 1,
  "lineas_pendientes": 2,
  "ingresos_cobrados": "5800.00",
  "monto_rentado": "5800.00",
  "equipos_agotados": 0
}
```

---

## Uso desde JavaScript

`frontend/assets/js/api.js` ya tiene todo envuelto. Envía la cookie de sesión en
cada petición (`credentials: "include"`) y, ante un `401`, redirige a
`login.html` salvo que ya estés ahí.

```js
// Sesión
const perfil = await Api.auth.yo();
await Api.auth.login("admin@rentavisual.mx", "Admin123!");
await Api.auth.logout();

// Listar
const equipos = await Api.equipos.listar({ disponibles: true });

// Crear una solicitud (cliente) o renta (admin)
const renta = await Api.rentas.crear({
  id_cliente: 1,
  fecha_inicio: "2026-11-03",
  fecha_fin_estimada: "2026-11-05",
  detalles: [{ id_equipo: 1, cantidad: 2 }],
});

// Aprobar o rechazar (admin)
await Api.rentas.aprobar(renta.id_renta, "Reservada");
await Api.rentas.rechazar(renta.id_renta, "Sin disponibilidad");

// Cancelar (cliente dueño o admin)
await Api.rentas.cancelar(renta.id_renta);

// Devolver todo
await Api.rentas.devolver(renta.id_renta);

// Reportes y auditoría
const ingresos = await Api.reportes.ingresosPorCategoria();
const bitacora = await Api.auditoria.listar({ limite: 25 });
```

Los errores se lanzan como excepción con el mensaje ya en español:

```js
try {
  await Api.rentas.crear(datos);
} catch (e) {
  alert(e.message);   // "Stock insuficiente de 'Proyector 4K': ..."
}
```
