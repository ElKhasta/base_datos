# Roles, permisos y flujo de solicitudes

RentaVisual tiene **dos roles** y una regla central: *el cliente pide, el
administrador aprueba*. Este documento explica cómo está implementado, qué puede
hacer cada rol y cómo comprobarlo.

---

## 1. Los dos roles

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| `admin` | Personal de la empresa | Todo el sistema: clientes, equipos, categorías, rentas, pagos, devoluciones, reportes, solicitudes y bitácora |
| `cliente` | Persona con cuenta de portal | Ver el catálogo, enviar solicitudes de renta, ver y cancelar **sus** solicitudes pendientes, cambiar su contraseña |

Un **cliente** (entidad de negocio) y un **usuario** (cuenta para iniciar sesión)
son cosas distintas:

- Un cliente puede existir sin cuenta. Así se conserva el historial de quien
  renta en mostrador.
- La cuenta se crea desde **Clientes → Acceso** o con el auto-registro del login.
- `usuario.id_cliente` es opcional (el admin no tiene cliente) y único (un
  cliente no puede tener dos cuentas).

### Credenciales de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@rentavisual.mx` | `Admin123!` |
| Cliente (Luis Ramírez) | `luis@rentavisual.mx` | `Cliente123!` |

Se crean al cargar `sql/02_datos.sql`. Cámbialas antes de usar datos reales.

---

## 2. Matriz de permisos

| Acción | Admin | Cliente |
|---|---|---|
| Ver catálogo de equipos y categorías | Sí | Sí |
| Crear / editar / borrar equipos y categorías | Sí | No (403) |
| Listar todos los clientes | Sí | No (403) |
| Crear / editar / dar de baja clientes | Sí | No (403) |
| Crear / revocar acceso al portal | Sí | No (403) |
| Crear renta a nombre de cualquier cliente | Sí | No |
| Crear solicitud a su propio nombre | Sí | Sí (forzado a `Solicitada`) |
| Ver todas las rentas | Sí | Solo las suyas |
| Aprobar o rechazar solicitudes | Sí | No (403) |
| Cancelar solicitud propia pendiente | Sí | Sí |
| Cancelar renta `Reservada` o `Activa` | Sí | No (409) |
| Registrar pagos | Sí | No |
| Registrar devoluciones | Sí | No |
| Ver reportes | Sí | No (403) |
| Ver bitácora de auditoría | Sí | No (403) |
| Cambiar su propia contraseña | Sí | Sí |

> **Importante:** ocultar botones en el navegador es solo presentación. Los
> permisos se verifican en FastAPI con `requiere_admin` / `requiere_cliente` y
> con filtros de propiedad en SQL. Un cliente que llame directamente a la API
> recibe `403`, y si pide una renta ajena recibe `404` para no revelar que existe.

---

## 3. Cómo funciona la sesión

No se usa JWT ni `localStorage`. El backend firma una cookie:

| Pieza | Detalle |
|---|---|
| Cookie | `rv_sesion` |
| Contenido | `id_usuario.expira.firma` |
| Firma | HMAC-SHA256 con `SECRET_KEY` |
| Atributos | `HttpOnly`, `SameSite=Lax`, `Secure` opcional, `path=/` |
| Duración | `SESSION_HORAS` (8 por omisión) |

En **cada petición** el backend:

1. Verifica la firma y la expiración.
2. Consulta el usuario, su rol y el estado del cliente en la base.
3. Rechaza con `401` si la cuenta está desactivada o el cliente fue dado de baja.

Por eso desactivar un usuario o cambiarle el rol surte efecto de inmediato, sin
esperar a que caduque la cookie.

### Contraseñas

- Algoritmo: **PBKDF2-SHA256** (librería estándar de Python).
- 600 000 iteraciones y sal aleatoria de 16 bytes por usuario.
- Formato guardado: `pbkdf2_sha256$600000$<sal>$<hash>`.
- Comparación en tiempo constante (`hmac.compare_digest`).
- Límite de **5 intentos fallidos por minuto** por IP + correo (`429`).

### Inicio y cierre

```
login.html
   │  POST /auth/login
   ├─ admin  → index.html
   └─ cliente→ portal.html
```

`POST /auth/logout` borra la cookie. Cualquier página sin sesión redirige a
`login.html`. El front no decide permisos: solo pinta el navbar según el rol que
devuelve `/auth/yo`.

---

## 4. El flujo de una solicitud

```
Cliente                         Servidor                         Administrador
───────                         ────────                         ─────────────
Elige equipos y fechas
POST /rentas  ───────────────►  fuerza estado "Solicitada"
                                usa el id_cliente de la sesión
                                NO aparta inventario
                                guarda auditoría
                                ◄──────────────────────────────  Bandeja de solicitudes
                                                                  (badge en el navbar)
                                                                  Revisa el detalle
                                revalida stock  ◄───────────────  POST /aprobar
                                aparta unidades
                                estado Reservada / Activa
                                guarda auditoría
                                ◄──────────────────────────────  o POST /rechazar
                                                                  exige motivo
                                estado Cancelada
                                motivo visible al cliente
```

### Estados

| Estado | Significado | ¿Aparta stock? |
|---|---|---|
| `Solicitada` | El cliente la envió; el admin aún no la revisa | **No** |
| `Reservada` | Aprobada; equipos apartados sin entregar | Sí |
| `Activa` | Aprobada y entregada | Sí |
| `Finalizada` | Todos los equipos fueron devueltos | No |
| `Cancelada` | Rechazada o cancelada | No |

### Reglas que aplica el backend

- Un cliente **no puede** elegir `id_cliente` ni `estado`: el servidor los
  sobrescribe.
- Una solicitud **no reserva inventario**; por eso puede haber varias solicitudes
  para el mismo equipo y solo una se aprueba.
- Al aprobar se **revalida el stock** dentro de la misma transacción. Si ya no
  alcanza, responde `409` y no cambia nada.
- El cambio genérico de estado (`PATCH /rentas/{id}/estado`) **no** permite
  mover `Solicitada` a `Reservada`/`Activa`; para eso existe `/aprobar`.
- El cliente solo cancela rentas propias en `Solicitada`.
- No se registran pagos ni devoluciones sobre una `Solicitada` o `Cancelada`.

---

## 5. Acceso al portal de un cliente existente

Un cliente que ya rentaba en mostrador no tiene cuenta. El admin se la crea:

1. **Clientes** → botón de la llave en la fila.
2. Escribe correo, contraseña (mínimo 8 caracteres) y, si quiere, un nombre para
   mostrar.
3. Guarda. El cliente ya puede entrar al portal y ver **solo sus** solicitudes.

Si el cliente olvida la contraseña, el admin vuelve a guardar el acceso con una
nueva. **Revocar acceso** desactiva la cuenta sin borrarla: el historial se
conserva y se puede reactivar después.

### Auto-registro

En `login.html` hay una pestaña **Crear cuenta**. Crea la ficha de cliente y la
cuenta en una sola transacción. Si el correo ya pertenece a un cliente
registrado, se rechaza y se pide al admin que otorgue el acceso (así nadie se
adueña de un historial ajeno).

---

## 6. Bitácora de auditoría

La tabla `auditoria` guarda, entre otros:

| Acción | Cuándo se registra |
|---|---|
| `login` / `logout` | Inicio y cierre de sesión |
| `registro` | Auto-registro de cliente |
| `solicitar_renta` / `crear_renta` | Alta de solicitud o renta |
| `aprobar_solicitud` / `rechazar_solicitud` | Decisión del admin |
| `cancelar_renta` | Cancelación del cliente o del admin |
| `cambiar_estado` | Cambio manual de estado |
| `registrar_pago` | Pago registrado |
| `registrar_devolucion` | Devolución de equipos |
| `crear_acceso` / `reactivar_acceso` / `revocar_acceso` | Gestión de cuentas |
| `crear/actualizar/eliminar_*` | Altas y cambios de clientes, equipos y categorías |

Se consulta en **Actividad** (`actividad.html`) con filtros por acción y entidad,
paginación y el usuario que la ejecutó. Es append-only desde la aplicación: la
interfaz no edita ni borra eventos.

---

## 7. Base de datos

La migración `sql/05_roles.sql` es **idempotente** y no borra datos. Agrega:

| Objeto | Para qué |
|---|---|
| Tabla `rol` | Catálogo de roles (`admin`, `cliente`) |
| Tabla `usuario` | Cuentas: email único, hash, rol, `id_cliente` opcional y único |
| Estado `Solicitada` en `estado_renta` | Solicitudes pendientes |
| Columnas en `renta` | `id_usuario_solicita`, `id_usuario_aprueba`, `fecha_aprobacion`, `motivo_rechazo` |
| Tabla `auditoria` | Bitácora con usuario, acción, entidad, detalle y fecha |

> **Nunca vuelvas a ejecutar `sql/01_esquema.sql` sobre una base con datos:**
> empieza con `DROP`. Para una instalación existente usa solo `05_roles.sql`.
> Para una instalación nueva, `01_esquema.sql` + `02_datos.sql` ya incluyen todo.

### Consultas útiles

```sql
-- ¿Quién puede entrar?
SELECT u.email, u.nombre, r.nombre AS rol, u.activo, u.id_cliente
  FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
 ORDER BY u.id_usuario;

-- Solicitudes pendientes
SELECT r.id_renta, c.nombre_completo, r.fecha_inicio, r.fecha_fin_estimada, r.monto_total
  FROM renta r
  JOIN cliente c      ON c.id_cliente = r.id_cliente
  JOIN estado_renta e ON e.id_estado = r.id_estado
 WHERE e.estado = 'Solicitada'
 ORDER BY r.fecha_registro;

-- Últimos movimientos
SELECT a.fecha, u.nombre, a.accion, a.entidad, a.id_entidad, a.detalle
  FROM auditoria a LEFT JOIN usuario u ON u.id_usuario = a.id_usuario
 ORDER BY a.fecha DESC
 LIMIT 20;
```

---

## 8. Cómo probarlo

### Con el navegador

1. Abre `http://localhost:8000` → debe llevar a `login.html`.
2. Entra como **cliente** (`luis@rentavisual.mx` / `Cliente123!`).
3. Agrega un equipo, elige fechas y envía la solicitud.
4. Cierra sesión y entra como **admin** (`admin@rentavisual.mx` / `Admin123!`).
5. El navbar muestra el badge de solicitudes. Abre **Solicitudes**, revisa y
   aprueba como `Reservada`.
6. Verifica en **Equipos** que la disponibilidad bajó y en **Actividad** que
   quedó el registro.

### Con la API (PowerShell)

```powershell
$base = "http://localhost:8000/api"
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Login admin
Invoke-RestMethod "$base/auth/login" -Method Post -ContentType "application/json" `
  -Body (@{email="admin@rentavisual.mx";password="Admin123!"} | ConvertTo-Json) `
  -WebSession $s

# ¿Quién soy?
Invoke-RestMethod "$base/auth/yo" -WebSession $s

# Solicitudes pendientes
Invoke-RestMethod "$base/rentas/pendientes/conteo" -WebSession $s
```

Un cliente que intente `GET /clientes` recibe `403`; uno que pida la renta de
otro cliente recibe `404`.

---

## 9. Errores frecuentes

| Síntoma | Causa / solución |
|---|---|
| `401 Inicia sesión para continuar` | Cookie expirada, `SECRET_KEY` cambió o mezclaste `127.0.0.1` con `localhost` (son orígenes distintos) |
| `403 No tienes permiso...` | Estás con el rol equivocado; entra con la cuenta correcta |
| El cliente no ve su solicitud | La cuenta no está ligada a su ficha de cliente; revisa **Clientes → Acceso** |
| `409 Solo se pueden aprobar solicitudes en estado 'Solicitada'` | Ya se aprobó, rechazó o canceló antes |
| `429 Demasiados intentos fallidos` | Espera un minuto o cambia la contraseña desde el panel |
| El admin no ve el badge | No hay solicitudes pendientes, o la sesión es de cliente |
| El login entra pero vuelve al inicio | Revisa que estés usando el mismo origen (`localhost:8000`) en todo el flujo |

---

*Ver también: `docs/API.md` (endpoints), `docs/FRONTEND.md` (pantallas y guards)
y `docs/MANUAL_USUARIO.md` (recorrido paso a paso).*
