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
| 404 | El registro no existe |
| 409 | Conflicto (stock, duplicado, cliente inactivo, pago excedido) |
| 422 | Error de validación de campos (Pydantic) |

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

| Método | Ruta | Notas |
|---|---|---|
| GET | `/clientes?q=texto&activos=true` | `q` busca en nombre, teléfono y email |
| GET | `/clientes/{id}` | — |
| POST | `/clientes` | — |
| PUT | `/clientes/{id}` | — |
| DELETE | `/clientes/{id}` | **Baja lógica**: pone `estatus_activo = false` |

```json
{
  "nombre_completo": "Luis Ramírez",
  "telefono": "5512345678",
  "email": "luis@email.com",
  "estatus_activo": true
}
```

Respuesta:
```json
{
  "id_cliente": 1,
  "nombre_completo": "Luis Ramírez",
  "telefono": "5512345678",
  "email": "luis@email.com",
  "estatus_activo": true,
  "fecha_alta": "2026-11-03"
}
```

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
  "lineas_pendientes": 2
}
```

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

### `POST /rentas` ← **crear renta**

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

- `estado`: `"Activa"` (por defecto) o `"Reservada"`.
- **El precio NO se envía**: lo lee el servidor de la tabla `equipo`.
- `subtotal = cantidad × precio_diario × días`, con mínimo 1 día.
- Si el mismo equipo se repite, las cantidades se suman.
- Devuelve la renta completa (201).

### `PATCH /rentas/{id}/estado`
```json
{ "estado": "Cancelada" }
```
Valores: `Reservada`, `Activa`, `Finalizada`, `Cancelada`.

### `POST /rentas/{id}/devoluciones`
```json
{ "fecha_devolucion": "2026-11-06", "id_detalles": [1, 2] }
```

- Si omites `id_detalles`, devuelve **todas** las líneas pendientes.
- Si omites `fecha_devolucion`, usa la fecha de hoy.
- Cuando ya no queda ninguna pendiente, la renta pasa sola a `Finalizada`.
- Responde 409 si no había nada pendiente.

### `DELETE /rentas/{id}`
Elimina la renta; detalles y pagos se borran en cascada.

---

## Pagos

### `GET /rentas/{id}/pagos`

### `POST /rentas/{id}/pagos`
```json
{ "monto_pagado": 1500.00, "metodo_pago": "Transferencia" }
```
`metodo_pago`: `Efectivo` | `Tarjeta` | `Transferencia`.
Responde 409 si la suma de pagos supera `monto_total`.

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

`frontend/assets/js/api.js` ya tiene todo envuelto:

```js
// Listar
const equipos = await Api.equipos.listar({ disponibles: true });

// Crear renta
const renta = await Api.rentas.crear({
  id_cliente: 1,
  fecha_inicio: "2026-11-03",
  fecha_fin_estimada: "2026-11-05",
  detalles: [{ id_equipo: 1, cantidad: 2 }],
});

// Devolver todo
await Api.rentas.devolver(renta.id_renta);

// Reportes
const ingresos = await Api.reportes.ingresosPorCategoria();
```

Los errores se lanzan como excepción con el mensaje ya en español:

```js
try {
  await Api.rentas.crear(datos);
} catch (e) {
  alert(e.message);   // "Stock insuficiente de 'Proyector 4K': ..."
}
```
