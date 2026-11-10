# Sistema de Renta de Equipos Audiovisuales

Proyecto escolar: base de datos relacional en **PostgreSQL 18** + **API REST en Python** + sitio web en **HTML/CSS/Bootstrap/JS**.

Incluye **inicio de sesión con dos roles**:

- **Administrador**: usa todo el sistema (clientes, equipos, rentas, reportes, solicitudes y bitácora).
- **Cliente**: entra a un portal propio para ver el catálogo, enviar solicitudes de renta y cancelar las suyas mientras sigan pendientes.

```
base_datos/
├── backend/          API en Python (FastAPI + psycopg)
├── frontend/         Sitio web (Bootstrap + JS)
├── sql/              Esquema, datos, consultas y prueba del proceso
└── docs/             Contrato de la API y documentación
```

> **Credenciales de demostración** (se crean con `sql/02_datos.sql`):
>
> | Rol | Correo | Contraseña |
> |---|---|---|
> | Administrador | `admin@rentavisual.mx` | `Admin123!` |
> | Cliente (Luis Ramírez) | `luis@rentavisual.mx` | `Cliente123!` |
>
> Cámbialas antes de usar el sistema con datos reales.

---

## Requisitos

- PostgreSQL 18 instalado y corriendo
- Python 3.11 o superior (probado con 3.12)
- pgAdmin (o DBeaver) para administrar la base

---

## 1. Crear la base de datos

### Opción A — automática (recomendada)

Desde `backend/`, con el venv activo:

```powershell
python scripts/crear_bd.py
```

Pide la contraseña de PostgreSQL, crea la base `renta_equipos`, carga el esquema
y los datos, y escribe solo el `backend/.env` con la cadena de conexión.

### Opción B — manual con pgAdmin

Clic derecho en *Databases* → **Create → Database** → nombre: `renta_equipos`.
Luego abre el **Query Tool** sobre esa base y ejecuta, en este orden:

1. `sql/01_esquema.sql`  → tablas, vista y triggers
2. `sql/02_datos.sql`    → datos de prueba (incluye roles y usuarios demo)

Verificación rápida (debe devolver 4 filas con su disponibilidad):

```sql
SELECT * FROM v_equipo_disponible ORDER BY id_equipo;
```

> **Si ya tenías la base creada antes de los roles**, no vuelvas a ejecutar
> `01_esquema.sql` (empieza con `DROP`). Aplica solo `sql/05_roles.sql`, que es
> idempotente y conserva los datos: agrega la tabla `rol`, la tabla `usuario`,
> el estado `Solicitada`, las columnas de trazabilidad de rentas y la bitácora
> `auditoria`.

> `sql/03_consultas.sql` son las 8 consultas de la evidencia técnica.
> `sql/04_verificacion.sql` simula el proceso central y termina en `ROLLBACK`, no ensucia la base.

---

## 2. Configurar el backend

Edita `backend/.env` y pon **tu** contraseña de PostgreSQL:

```
DATABASE_URL=postgresql://postgres:TU_CONTRASENA@localhost:5432/renta_equipos
SECRET_KEY=una-cadena-larga-y-aleatoria
```

`SECRET_KEY` firma la cookie de sesión. `crear_bd.py` la genera sola si falta;
si cambias la base o el valor, todas las sesiones abiertas se invalidan.

En PowerShell, desde la raíz del proyecto:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> Si PowerShell bloquea el `Activate.ps1`, ejecuta una vez:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## 3. Levantar el sitio

```powershell
# dentro de backend y con el venv activo
uvicorn app.main:app --reload
```

| URL | Qué es |
|---|---|
| http://localhost:8000/ | El sitio (redirige a `login.html` si no hay sesión) |
| http://localhost:8000/login.html | Iniciar sesión o registrarse como cliente |
| http://localhost:8000/portal.html | Portal del cliente (solo rol `cliente`) |
| http://localhost:8000/docs | Documentación interactiva de la API (Swagger) |
| http://localhost:8000/api/salud | Prueba de conexión a PostgreSQL |

Si el panel del administrador muestra "Conectado a renta_equipos — PostgreSQL OK", todo está bien.

Para comprobar el proceso central completo (crear renta, validar stock, pagar y
devolver) sin usar el navegador:

```powershell
python scripts/prueba_api.py
```

Debe terminar con `RESULTADO: todas las pruebas pasaron`.

---

## 4. Reparto de trabajo

### Backend (Python)
- `backend/app/main.py` — arranque, CORS, traducción de errores de PostgreSQL
- `backend/app/db.py` — pool de conexiones
- `backend/app/security.py` — hash PBKDF2, cookie de sesión firmada y dependencias de rol
- `backend/app/config.py` — lectura de `.env` (base, `SECRET_KEY`, duración de sesión)
- `backend/app/schemas.py` — validación de datos de entrada
- `backend/app/routers/` — un archivo por entidad (`auth`, `rentas`, `clientes`, `equipos`, `categorias`, `pagos`, `reportes`, `auditoria`)

### Frontend
- `frontend/login.html` — inicio de sesión y registro de clientes
- `frontend/index.html` — panel general (métricas, solicitudes pendientes, actividad)
- `frontend/solicitudes.html` — bandeja de solicitudes: aprobar o rechazar
- `frontend/clientes.html` — alta, edición, baja lógica, historial y **acceso al portal**
- `frontend/equipos.html` — inventario y catálogo de categorías
- `frontend/rentas.html` — proceso central: crear renta, pagos y devoluciones
- `frontend/reportes.html` — 7 reportes con JOIN, filtros y agrupaciones
- `frontend/portal.html` — portal del cliente: catálogo, carrito y sus solicitudes
- `frontend/actividad.html` — bitácora de auditoría (solo administradores)
- `frontend/assets/js/api.js` — cliente HTTP (`Api.rentas.listar()`, etc.) con cookies
- `frontend/assets/js/comun.js` — sesión, navbar por rol, guards, toasts, formatos y helpers
- `frontend/assets/js/paginas/` — un archivo por pantalla
- `frontend/assets/css/estilos.css` — identidad visual y estilos de impresión

El contrato completo de endpoints está en **`docs/API.md`**, la guía para
trabajar el diseño sin romper nada en **`docs/FRONTEND.md`** y el detalle de
roles y permisos en **`docs/ROLES.md`**.

---

## 5. Proceso central: de la solicitud a la devolución

```
Cliente envía solicitud   ->  Solicitada   (no aparta inventario)
Admin aprueba             ->  Reservada / Activa   (aquí SÍ se valida y aparta stock)
Admin rechaza / cancela   ->  Cancelada    (con motivo visible para el cliente)
Devolución de todo        ->  Finalizada
```

`POST /api/rentas` hace todo dentro de **una sola transacción**:

1. Si quien llama es un cliente, el servidor **ignora** el `id_cliente` del
   navegador y usa el de su cuenta; además fuerza el estado `Solicitada`.
2. Valida que el cliente exista y esté activo.
3. Por cada equipo: bloquea la fila (`FOR UPDATE`), lee el precio **de la base** (nunca del navegador) y verifica disponibilidad real.
4. Calcula `subtotal = cantidad × precio_diario × días`.
5. Inserta la renta y sus detalles.
6. Un trigger recalcula `monto_total`.

`POST /api/rentas/{id}/aprobar` (solo admin) vuelve a validar el stock en ese
momento y aparta las unidades. `POST /api/rentas/{id}/rechazar` exige un motivo
y deja la renta `Cancelada` sin tocar inventario.

Si algo falla (stock insuficiente, cliente inactivo, fecha inválida), **no se guarda nada**.

La disponibilidad no se guarda en una columna: se calcula con la vista `v_equipo_disponible`, así nunca se desincroniza.

---

## 6. Roles y seguridad

| Tema | Decisión |
|---|---|
| Sesión | Cookie `rv_sesion` `HttpOnly`, firmada con HMAC-SHA256; no se usa `localStorage` ni JWT |
| Contraseñas | PBKDF2-SHA256, 600 000 iteraciones, sal aleatoria por usuario |
| Rol | Se consulta en la base en **cada petición**; desactivar o cambiar un rol surte efecto de inmediato |
| Permisos | Se aplican en FastAPI (`requiere_admin`, `requiere_cliente`, filtros de propiedad); ocultar botones es solo presentación |
| Intentos de login | Límite de 5 fallos por minuto por IP + correo (memoria del proceso) |
| Bitácora | Todo movimiento sensible se guarda en `auditoria`; solo el admin la consulta |

El detalle completo (matriz de permisos, flujo de acceso y cómo probarlo) está
en **`docs/ROLES.md`**.

---

## 7. Documentación

| Documento | Contenido |
|---|---|
| `docs/MANUAL_DESDE_CERO.md` | **Manual para reconstruir todo desde cero**, fase por fase, con checkpoints |
| `docs/RUTA_APRENDIZAJE.md` | Qué estudiar y en qué orden, y cómo auditar código (incluido el de una IA) |
| `docs/MANUAL_USUARIO.md` | Manual de usuario del sitio, con capturas y solución de problemas |
| `docs/ROLES.md` | **Roles, permisos, sesión y flujo de solicitudes** |
| `docs/COMO_FUNCIONA.md` | Explicación técnica: cómo funciona cada parte y por qué |
| `docs/API.md` | Contrato de endpoints para el equipo de frontend |
| `docs/FRONTEND.md` | **Guía del frontend**: estructura, clases, cómo personalizar el diseño y agregar pantallas |
| `docs/EVIDENCIA.md` | Modelo relacional, diagrama ER, álgebra relacional |
| `docs/GUIA_GITHUB.md` | Cómo subir el proyecto y trabajar en equipo |

---

## 8. Problemas comunes

| Síntoma | Causa / solución |
|---|---|
| *"la ejecución de scripts está deshabilitada"* | Ejecuta `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| La ventana se cierra al hacer doble clic en `Activate.ps1` | Ese archivo no se ejecuta con doble clic; abre PowerShell en la carpeta y escribe `.\\.venv\\Scripts\\Activate.ps1` |
| `connection refused` | PostgreSQL no está corriendo |
| `password authentication failed` | Contraseña mal en `backend/.env` |
| `database "renta_equipos" does not exist` | Falta crear la base en pgAdmin |
| `No module named app` | Ejecutaste `uvicorn` desde la carpeta equivocada; debe ser desde `backend/` |
| El front dice "No se pudo conectar" | El backend no está levantado |
| `401 Inicia sesión para continuar` | La cookie expiró, cambió `SECRET_KEY` o entraste por otro origen (`127.0.0.1` ≠ `localhost`) |
| `403 No tienes permiso...` | Estás con el rol equivocado; el cliente solo puede ver su portal |
| Un cliente no puede entrar | Revisa en **Clientes → Acceso** que su cuenta exista y esté activa |
| `column "x" does not exist` | Los nombres en PostgreSQL son en minúsculas |
