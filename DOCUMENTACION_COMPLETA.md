# RentaVisual — Documentación completa

**Sistema de renta de equipos audiovisuales**
Versión 1.0 · Noviembre 2026

Este único archivo reúne **toda** la documentación del proyecto: cómo arrancarlo
en VS Code, cómo usarlo, cómo está hecha la API, cómo se diseñó la base y cómo
trabajar en equipo. Es una **compilación**: los archivos originales siguen
estando en `docs/` y en la raíz, y son la fuente de verdad.

## Cómo usar este documento

- Si es tu primera vez con el proyecto, empieza por la **Parte 0** (VS Code).
- Si vas a usar el sistema, lee la **Parte 2** (manual de usuario) y la
  **Parte 3** (roles).
- Si vas a programar el frontend, lee la **Parte 4** (API) y la **Parte 5**.
- Si vas a explicar el proyecto, lee la **Parte 6** (cómo funciona), la
  **Parte 7** (construcción desde cero) y la **Parte 9** (evidencia).
- Las capturas de pantalla están en `docs/img/`.

## Índice

| Parte | Documento | Qué contiene |
|---|---|---|
| [0. Guía de VS Code (empieza aquí)](#vscode) | `docs/GUIA_VSCODE.md` | Ver Parte 0 |
| [1. Visión general y arranque](#readme) | `README.md` | Ver Parte 1 |
| [2. Manual de usuario](#manual-usuario) | `docs/MANUAL_USUARIO.md` | Ver Parte 2 |
| [3. Roles, permisos y sesión](#roles) | `docs/ROLES.md` | Ver Parte 3 |
| [4. Contrato de la API](#api) | `docs/API.md` | Ver Parte 4 |
| [5. Guía del frontend](#frontend) | `docs/FRONTEND.md` | Ver Parte 5 |
| [6. Cómo funciona (explicación técnica)](#como-funciona) | `docs/COMO_FUNCIONA.md` | Ver Parte 6 |
| [7. Manual de construcción desde cero](#desde-cero) | `docs/MANUAL_DESDE_CERO.md` | Ver Parte 7 |
| [8. Ruta de aprendizaje](#ruta-aprendizaje) | `docs/RUTA_APRENDIZAJE.md` | Ver Parte 8 |
| [9. Evidencia técnica (modelo y álgebra)](#evidencia) | `docs/EVIDENCIA.md` | Ver Parte 9 |
| [10. Guía de GitHub y trabajo en equipo](#github) | `docs/GUIA_GITHUB.md` | Ver Parte 10 |

---
<a id="vscode"></a>

# Parte 0 — Guía de VS Code (empieza aquí)

## Guía de VS Code (Windows + PowerShell)

Esta guía es para abrir el proyecto, activar el entorno virtual, levantar la API,
correr las pruebas y depurar. Está escrita para que cualquier compañero la siga
**en orden**, sin suponer que ya configuró Python.

> **Resumen para impacientes:** abre la terminal en `backend`, ejecuta
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force`, luego
> `.\.venv\Scripts\Activate.ps1`, luego `uvicorn app.main:app --reload`, y abre
> `http://localhost:8000`. El resto de esta guía explica por qué.

---

### 0. Requisitos previos

| Herramienta | Versión | Comprobación |
|---|---|---|
| Python | 3.11 o 3.12 | `python --version` |
| PostgreSQL | 18 | Servicio "postgresql-x64-18" corriendo |
| Visual Studio Code | reciente | Extensión **Python** de Microsoft |
| Git | cualquiera | `git --version` |

Si `python` no existe en PowerShell, Windows trae el lanzador `py`:

```powershell
py -0p            # muestra las versiones instaladas
py -3.12 --version
```

---

### 1. Abrir el proyecto

1. VS Code → **File → Open Folder…** → selecciona la carpeta `base_datos`
   (la que contiene `backend`, `frontend`, `sql` y `docs`).
2. Si aparece *"Do you trust the authors of the files in this folder?"*, elige
   **Yes**. Sin confiar en el workspace, la extensión de Python no arranca.
3. Abre una terminal integrada con **Ctrl + `** (Ctrl + tilde) o
   **Terminal → New Terminal**.

Verás algo como `PS C:\Users\...\base_datos>`. Todavía no actives nada: primero
hay que estar en la carpeta correcta.

---

### 2. Instalar las extensiones recomendadas

Abre **Extensions (Ctrl+Shift+X)** e instala:

- **Python** (`ms-python.python`)
- **Pylance** (`ms-python.vscode-pylance`)
- **Python Debugger** (`ms-python.debugpy`)

El repositorio trae un `.vscode/extensions.json`, así que VS Code te sugerirá
instalarlas automáticamente al abrir el proyecto.

---

### 3. Crear el entorno virtual (solo la primera vez)

Todo el código Python debe correr dentro de `.venv`: así las dependencias del
proyecto no se mezclan con las de otros trabajos.

Desde la raíz del proyecto, en la terminal de VS Code:

```powershell
cd backend
python -m venv .venv
```

O, si `python` no funciona:

```powershell
py -3.12 -m venv .venv
```

El resultado es `backend\.venv\Scripts\python.exe`. **Ese** es el intérprete que
debe usar VS Code.

> Si clonaste el repositorio, `.venv` no viene incluido (está en `.gitignore`):
> hay que crearlo una vez por máquina.

---

### 4. El paso que más falla: `Activate.ps1`

PowerShell bloquea los scripts `.ps1` por defecto. Si intentas activar y sale:

```
No se puede cargar el archivo ... Activate.ps1 porque su ejecución está
deshabilitada en este sistema.
```

La solución **en esa misma terminal** es cambiar la política solo para el
proceso actual:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\.venv\Scripts\Activate.ps1
```

#### ¿Por qué `-Scope Process` y no `-Scope CurrentUser`?

| Opción | Qué hace | Recomendación |
|---|---|---|
| `-Scope Process` | Aplica solo a esa terminal; se pierde al cerrarla | **Úsala**: no necesitas administrador ni dejas el equipo más permisivo |
| `-Scope CurrentUser -ExecutionPolicy RemoteSigned` | Permite scripts locales de forma permanente para tu usuario | Opcional si te cansas de escribirla; pide confirmación al dueño del equipo |
| `Set-ExecutionPolicy Unrestricted` | Permite todo | **No** |

Cada terminal nueva es un proceso nuevo: vuelve a escribir las dos líneas. Por
eso conviene dejar **una sola terminal de VS Code abierta** mientras trabajas.

#### Cómo saber que sí se activó

El prompt debe mostrar `(.venv)` al inicio. Comprueba además:

```powershell
$env:VIRTUAL_ENV
python -m pip --version
```

Debe aparecer una ruta que termine en `backend\.venv\Scripts\python.exe`. Si
aparece `C:\Users\...\AppData\Local\Programs\Python\...`, el intérprete está mal
elegido (ver apartado siguiente).

#### Seleccionar el intérprete en VS Code

**Ctrl+Shift+P → `Python: Select Interpreter` →**
`.\backend\.venv\Scripts\python.exe`.

El archivo `.vscode/settings.json` del repositorio ya lo deja configurado, pero
si VS Code no lo detecta, hazlo a mano con ese comando.

---

### 5. Instalar dependencias

Con el venv activo y estando en `backend`:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Debe instalar FastAPI, Uvicorn, psycopg, python-dotenv y Pydantic (versiones
fijadas en `requirements.txt`).

---

### 6. La base de datos y el archivo `.env`

#### Si tu compañero parte de cero

```powershell
python scripts/crear_bd.py
```

Pide la contraseña de PostgreSQL, crea la base `renta_equipos`, carga
`sql/01_esquema.sql` + `sql/02_datos.sql` y **escribe `backend/.env`** con la
cadena de conexión y una `SECRET_KEY` aleatoria.

> ⚠️ `01_esquema.sql` empieza con `DROP`. No lo ejecutes sobre una base que ya
> tenga datos. Si la base ya existía de una versión anterior, aplica solo
> `sql/05_roles.sql` (es idempotente y conserva clientes y rentas).

#### Si quieres configurar `.env` a mano

Copia `backend/.env.example` como `backend/.env` y completa:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `CORS_ORIGINS` | Orígenes permitidos si usas Live Server (`:5500`) |
| `SECRET_KEY` | Firma la cookie de sesión; debe ser larga y aleatoria |
| `SESSION_HORAS` | Duración de la sesión (8 por defecto) |
| `COOKIE_SECURE` | `true` solo si sirves por HTTPS |
| `SEMBRAR_USUARIOS` | Crea los usuarios demo al arrancar si no existen |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenciales del administrador |
| `DEMO_CLIENTE_ID` / `DEMO_CLIENTE_EMAIL` / `DEMO_CLIENTE_PASSWORD` | Usuario demo ligado al cliente 1 |

`.env` **nunca** se sube a Git (está en `.gitignore`). Si cambias `SECRET_KEY`,
todas las sesiones abiertas se invalidan.

---

### 7. Levantar la API

Estando en `backend`, con el venv activo:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- `--reload`: reinicia el servidor cuando guardas un `.py` (solo desarrollo).
- `--host 127.0.0.1`: solo escucha en tu equipo.
- `--port 8000`: el puerto que usa toda la documentación.

Comprobaciones:

| URL | Resultado esperado |
|---|---|
| http://localhost:8000/docs | Swagger UI |
| http://localhost:8000/api/salud | `{"estado":"ok", ...}` |
| http://localhost:8000/ | Redirige a `login.html` |

> **Usa siempre `http://localhost:8000` en el navegador.** Aunque
> `127.0.0.1:8000` apunte al mismo servidor, para el navegador es **otro
> origen** y no enviará la cookie de sesión: verás `401 Inicia sesión para
> continuar`.

#### Forma rápida en VS Code

- **Ctrl+Shift+B** ejecuta la tarea **Iniciar API (uvicorn --reload)**.
- **F5** inicia la misma API con depurador (archivo `.vscode/launch.json`).

No hagas las dos cosas a la vez: el puerto 8000 solo admite un proceso.

---

### 8. Abrir el sitio

Entra a **http://localhost:8000**:

1. Te lleva a `login.html`.
2. Administrador → `admin@rentavisual.mx` / `Admin123!` → panel general.
3. Cliente → `luis@rentavisual.mx` / `Cliente123!` → portal del cliente.

El backend sirve la carpeta `frontend`, así que **no hace falta Live Server**.
Si prefieres Live Server en `:5500`, el CORS ya lo permite; aun así, la forma
recomendada es servir todo desde `:8000` para no mezclar orígenes.

---

### 9. Pruebas personalizadas

#### 9.1 Prueba de humo incluida

Con la API arriba, en otra terminal (también con el venv activo):

```powershell
python scripts/prueba_api.py
```

Recorre: conexión, login de ambos roles, permisos (403/404), solicitud del
cliente **sin** apartar stock, aprobación del admin **con** revalidación de
stock, bitácora, reportes y limpieza. Crea una renta temporal y la borra al
final; no toca las rentas reales.

En VS Code: **Ctrl+Shift+P → Tasks: Run Test Task → Prueba de humo de la API**.

#### 9.2 Probar desde Swagger (sin escribir código)

1. Abre http://localhost:8000/docs.
2. Ejecuta `POST /auth/login` con las credenciales del admin.
3. La cookie queda guardada en el navegador: ya puedes ejecutar
   `GET /auth/yo`, `GET /clientes`, `GET /auditoria`, etc.
4. Para probar el otro rol, cierra sesión y haz login con el cliente.
   Un `GET /clientes` con la cookie del cliente debe responder `403`.

#### 9.3 Probar desde PowerShell

El truco es **guardar la cookie** con `-WebSession`:

```powershell
$base = "http://localhost:8000/api"
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$body = @{ email = "admin@rentavisual.mx"; password = "Admin123!" } | ConvertTo-Json
Invoke-RestMethod "$base/auth/login" -Method Post -ContentType "application/json" -Body $body -WebSession $s
Invoke-RestMethod "$base/auth/yo" -WebSession $s
Invoke-RestMethod "$base/rentas/pendientes/conteo" -WebSession $s
```

Sin `-WebSession`, cada llamada va "sin sesión" y responde `401`.

#### 9.4 Escribir tu propia prueba

Usa `urllib` + `http.cookiejar` (lo que hace `prueba_api.py`) o JavaScript desde
la consola del navegador:

```js
const r = await fetch("/api/reportes/resumen", { credentials: "include" });
console.log(r.status, await r.json());
```

`credentials: "include"` es obligatorio para enviar la cookie.

---

### 10. Tareas y depuración ya configuradas

Estos archivos vienen en `.vscode/` (se suben a Git a propósito):

| Archivo | Para qué |
|---|---|
| `settings.json` | Fija el intérprete de `backend/.venv` y PowerShell como terminal |
| `tasks.json` | Atajos para instalar, crear BD, arrancar API, probar y abrir el sitio |
| `launch.json` | Depuración con **F5** (API y script de pruebas) |
| `extensions.json` | Recomienda las extensiones de Python |

| Acción | Atajo / comando |
|---|---|
| Abrir terminal | **Ctrl + `** |
| Arrancar API | **Ctrl+Shift+B** |
| Correr pruebas | **Ctrl+Shift+P → Tasks: Run Test Task** |
| Depurar API | **F5** → *API RentaVisual (uvicorn)* |
| Detener servidor | En su terminal, **Ctrl+C** |
| Cambiar de terminal | **Ctrl+Shift+`** |

---

### 11. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `Activate.ps1` dice que la ejecución está deshabilitada | Política de PowerShell | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force` y vuelve a activar |
| `python` no se reconoce | No está en el PATH | Usa `py -3.12 -m venv .venv` |
| `No module named fastapi` | Intérprete equivocado | Selecciona `.venv` con *Python: Select Interpreter* y activa el entorno |
| `Only one usage of each socket address` | Puerto 8000 ocupado | `netstat -ano \| findstr :8000`, luego `Stop-Process -Id <PID> -Force` |
| `401 Inicia sesión para continuar` | Sin login, cookie expirada o mezclaste `127.0.0.1` con `localhost` | Usa `http://localhost:8000` y vuelve a entrar |
| `403 No tienes permiso` | Rol equivocado | Cliente → portal; admin → panel |
| `No se pudo conectar` | Backend apagado | Arranca uvicorn de nuevo |
| Error de conexión a PostgreSQL | `.env` o servicio caído | Revisa `DATABASE_URL` y que Postgres esté corriendo |
| La página queda en blanco | Ruta mal escrita | Verifica `http://localhost:8000/login.html` |
| El navegador no guarda la sesión | Cambió `SECRET_KEY` o se usa otro origen | Vuelve a iniciar sesión en `localhost:8000` |

---

### 12. Checklist para un compañero (copiar y pegar)

```powershell
# 1. Colocate en backend
cd backend

# 2. Permite Activate.ps1 solo en esta terminal
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

# 3. Crea el entorno (solo la primera vez)
python -m venv .venv

# 4. Actívalo
.\.venv\Scripts\Activate.ps1

# 5. Instala dependencias (solo la primera vez)
python -m pip install -r requirements.txt

# 6. Crea la base y el .env (solo la primera vez; Borra datos existentes)
python scripts/crear_bd.py

# 7. Arranca la API
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

En **otra** terminal (pasos 2 y 4 otra vez):

```powershell
python scripts/prueba_api.py
```

Y en el navegador: **http://localhost:8000**.

---

*Ver también: `README.md` (visión general) y `docs/DOCUMENTACION_COMPLETA.md`
(toda la documentación del proyecto en un solo archivo).*

---
<a id="readme"></a>

# Parte 1 — Visión general y arranque

## Sistema de Renta de Equipos Audiovisuales

Proyecto escolar: base de datos relacional en **PostgreSQL 18** + **API REST en Python** + sitio web en **HTML/CSS/Bootstrap/JS**.

Incluye **inicio de sesión con dos roles**:

- **Administrador**: usa todo el sistema (clientes, equipos, rentas, reportes, solicitudes y bitácora).
- **Cliente**: entra a un portal propio para ver el catálogo, enviar solicitudes de renta y cancelar las suyas mientras sigan pendientes.

```
base_datos/
├── backend/          API en Python (FastAPI + psycopg)
├── frontend/         Sitio web (Bootstrap + JS)
├── sql/              Esquema, datos, consultas y prueba del proceso
├── docs/             Manuales y contratos (incluye la guía de VS Code)
├── scripts/          Generador de la documentación completa
├── .vscode/          Tareas y depuración listas para usar
└── DOCUMENTACION_COMPLETA.md   Todos los manuales en un solo archivo
```

> **Empieza aquí:** [`docs/GUIA_VSCODE.md`](docs/GUIA_VSCODE.md) explica paso a
> paso cómo activar `Activate.ps1`, levantar la API y correr las pruebas desde
> VS Code. Si quieres todo junto, abre
> [`DOCUMENTACION_COMPLETA.md`](DOCUMENTACION_COMPLETA.md).

> **Credenciales de demostración** (se crean con `sql/02_datos.sql`):
>
> | Rol | Correo | Contraseña |
> |---|---|---|
> | Administrador | `admin@rentavisual.mx` | `Admin123!` |
> | Cliente (Luis Ramírez) | `luis@rentavisual.mx` | `Cliente123!` |
>
> Cámbialas antes de usar el sistema con datos reales.

---

### Requisitos

- PostgreSQL 18 instalado y corriendo
- Python 3.11 o superior (probado con 3.12)
- pgAdmin (o DBeaver) para administrar la base

---

### 1. Crear la base de datos

#### Opción A — automática (recomendada)

Desde `backend/`, con el venv activo:

```powershell
python scripts/crear_bd.py
```

Pide la contraseña de PostgreSQL, crea la base `renta_equipos`, carga el esquema
y los datos, y escribe solo el `backend/.env` con la cadena de conexión.

#### Opción B — manual con pgAdmin

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

### 2. Configurar el backend

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

### 3. Levantar el sitio

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

### 4. Reparto de trabajo

#### Backend (Python)
- `backend/app/main.py` — arranque, CORS, traducción de errores de PostgreSQL
- `backend/app/db.py` — pool de conexiones
- `backend/app/security.py` — hash PBKDF2, cookie de sesión firmada y dependencias de rol
- `backend/app/config.py` — lectura de `.env` (base, `SECRET_KEY`, duración de sesión)
- `backend/app/schemas.py` — validación de datos de entrada
- `backend/app/routers/` — un archivo por entidad (`auth`, `rentas`, `clientes`, `equipos`, `categorias`, `pagos`, `reportes`, `auditoria`)

#### Frontend
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

### 5. Proceso central: de la solicitud a la devolución

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

### 6. Roles y seguridad

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

### 7. Documentación

| Documento | Contenido |
|---|---|
| `DOCUMENTACION_COMPLETA.md` | **Todos los manuales en un solo archivo** (generado automáticamente) |
| `docs/GUIA_VSCODE.md` | **Empieza aquí**: activar `Activate.ps1`, arrancar la API y probar desde VS Code |
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

### 8. Problemas comunes

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

---
<a id="manual-usuario"></a>

# Parte 2 — Manual de usuario

## Manual de usuario — RentaVisual

**Sistema de renta de equipos audiovisuales**
Versión 1.0 · Noviembre 2026

---

### Índice

1. [¿Qué es el sistema?](#1-qué-es-el-sistema)
2. [Requisitos](#2-requisitos)
3. [Instalación paso a paso](#3-instalación-paso-a-paso)
4. [Cómo iniciar el sistema](#4-cómo-iniciar-el-sistema)
5. [Iniciar sesión y roles](#5-iniciar-sesión-y-roles)
6. [Recorrido por el sitio (administrador)](#6-recorrido-por-el-sitio-administrador)
7. [Portal del cliente](#7-portal-del-cliente)
8. [Registrar una renta](#8-registrar-una-renta)
9. [Aprobar o rechazar solicitudes](#9-aprobar-o-rechazar-solicitudes)
10. [Cobrar una renta](#10-cobrar-una-renta)
11. [Devolver los equipos](#11-devolver-los-equipos)
12. [Consultar los reportes](#12-consultar-los-reportes)
13. [Solución de problemas](#13-solución-de-problemas)
14. [Glosario](#14-glosario)

---

### 1. ¿Qué es el sistema?

RentaVisual administra el inventario de equipo audiovisual de una empresa de
rentas y controla:

- el **catálogo** de equipos por categoría (audio, video, iluminación),
- los **clientes** que rentan,
- las **rentas**, que pueden incluir varios equipos a la vez,
- la **cantidad** y la **fecha de devolución** de cada equipo rentado,
- los **pagos** y los **reportes** de ingresos.

El sistema funciona en el navegador y guarda todo en una base de datos
PostgreSQL. No requiere internet.

Tiene **dos tipos de usuario**:

- **Administrador**: opera todo el negocio (clientes, inventario, rentas,
  reportes, solicitudes y bitácora).
- **Cliente**: entra a un portal para ver el catálogo, pedir equipos y seguir
  sus propias solicitudes.

---

### 2. Requisitos

| Componente | Versión | Para qué |
|---|---|---|
| PostgreSQL | 18.x | Guardar los datos |
| Python | 3.11 o superior | Ejecutar el servidor |
| Navegador | Chrome, Edge o Firefox actualizado | Ver el sitio |

> El proyecto ya incluye el código del servidor y del sitio. Lo único que hay
> que preparar es la base de datos.

---

### 3. Instalación paso a paso

Esta instalación se hace **una sola vez**.

#### 3.1 Abrir PowerShell en la carpeta del proyecto

1. Abre el Explorador de Windows y entra a la carpeta del proyecto.
2. Haz clic en la barra de direcciones, escribe `powershell` y presiona **Enter**.

Se abre una ventana azul ubicada ya en la carpeta correcta.

> **Importante:** si escribes la ruta a mano:
> `cd "C:\Users\casta\OneDrive\Documents\base_datos"`
> (las comillas solo son necesarias si la ruta tiene espacios).

#### 3.2 Habilitar la ejecución de scripts (solo la primera vez)

Si al activar el entorno aparece el mensaje *"la ejecución de scripts está
deshabilitada en este sistema"*, ejecuta:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Responde `S` (Sí) si lo pide. Este cambio solo afecta a tu usuario y es
reversible.

#### 3.3 Entrar a la carpeta del backend y activar el entorno

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
```

Sabrás que funcionó porque el inicio de la línea cambia a `(.venv)`.

#### 3.4 Crear la base de datos

```powershell
python scripts\crear_bd.py
```

El programa pide la **contraseña del usuario `postgres`** (la que pusiste al
instalar PostgreSQL; al escribir no se ven los caracteres) y después muestra:

```
Base 'renta_equipos' creada.
Cargando estructura y datos:
  -> 01_esquema.sql ... OK
  -> 02_datos.sql ... OK

Listo: 4 equipos, 2 rentas.
Disponibilidad calculada por la vista:
   [1] Microfono Inalambrico         stock=10  disponible=8
   [2] Bocina Activa 15 pulgadas     stock=4   disponible=4
   [3] Proyector 4K                  stock=2   disponible=1
   [4] Kit de Luces LED              stock=6   disponible=6
```

La instalación terminó. La próxima vez ya no hace falta repetir estos pasos.

---

### 4. Cómo iniciar el sistema

Cada vez que quieras usar el sitio:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Verás algo así:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

Abre el navegador en **http://localhost:8000**

Para **detener** el servidor: vuelve a la ventana de PowerShell y presiona
`Ctrl + C`.

> Deja la ventana de PowerShell abierta mientras uses el sitio. Si la cierras,
> el sistema deja de funcionar.

---

### 5. Iniciar sesión y roles

Al abrir **http://localhost:8000** el sistema pide iniciar sesión.

![Pantalla de inicio de sesión](docs/img/01-panel-principal.jpeg)

#### 5.1 Entrar con una cuenta

1. Escribe tu **correo** y **contraseña**.
2. Pulsa **Entrar**.

El sistema decide a dónde llevarte según tu rol:

| Rol | Pantalla inicial | Ve en el menú |
|---|---|---|
| Administrador | Panel general | Inicio, Solicitudes, Clientes, Equipos, Rentas, Reportes, Actividad y API |
| Cliente | Portal del cliente | Catálogo y Mis solicitudes |

Las cuentas de demostración son:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@rentavisual.mx` | `Admin123!` |
| Cliente | `luis@rentavisual.mx` | `Cliente123!` |

#### 5.2 Crear una cuenta de cliente

En la misma pantalla, pestaña **Crear cuenta**, un cliente nuevo puede
registrarse con su nombre, correo, teléfono y una contraseña de al menos 8
caracteres. Al terminar entra directo a su portal.

> Si el correo ya pertenece a un cliente que la empresa tenía registrado, el
> registro se rechaza: pide al administrador que te otorgue acceso desde
> **Clientes**. Así nadie se adueña del historial de otra persona.

#### 5.3 Cambiar la contraseña y cerrar sesión

En la esquina superior derecha, el menú con tu nombre tiene **Cambiar
contraseña** y **Cerrar sesión**. Al cerrar, el sistema vuelve al login y borra
la cookie de sesión.

#### 5.4 Si olvidas la contraseña

El cliente debe pedir al administrador que vuelva a guardar su acceso desde
**Clientes → llave**. El administrador puede asignar una contraseña nueva sin
perder el historial.

---

### 6. Recorrido por el sitio (administrador)

![Pantalla principal del sistema](docs/img/01-panel-principal.jpeg)

La barra superior está siempre visible y lleva a las secciones del sistema. A la
derecha está el acceso **API**, que abre la documentación técnica (Swagger); ese
enlace es para el equipo de desarrollo, no para el usuario final. El cliente no
ve ese enlace.

#### 6.1 Panel general (Inicio)

Es la primera pantalla y resume el estado del negocio:

| Tarjeta | Qué muestra |
|---|---|
| **Clientes activos** | Clientes que no han sido dados de baja |
| **Rentas activas** | Contratos que están en curso ahora mismo |
| **Equipos fuera** | Renglones de equipo que aún no se devuelven |
| **Ingresos cobrados** | Suma de todos los pagos registrados |

Debajo hay tres tarjetas de aviso: **rentas vencidas** y **equipos agotados**
(cada una con un botón que lleva al reporte correspondiente) y el **monto total
rentado**. Más abajo aparecen los accesos rápidos, las **últimas rentas** (el
folio abre el detalle) y la **disponibilidad** de cada equipo.

Todas las cifras se calculan en el momento; no están guardadas. El botón
**Recargar** vuelve a consultar la base de datos.

#### 6.2 Clientes

Permite buscar por nombre, teléfono o correo, filtrar activos/inactivos y ver
cuántos clientes hay. Con **Nuevo cliente** se registra una persona (nombre
obligatorio de al menos 3 caracteres; teléfono y correo opcionales).

Cada fila tiene cuatro acciones:

- **Acceso** (llave): crea o actualiza la cuenta del cliente en el portal, o la
  revoca. La columna **Acceso** indica si ya puede entrar.
- **Historial** (reloj): muestra todas las rentas de ese cliente.
- **Editar** (lápiz): corrige sus datos.
- **Baja / Reactivar**: la baja es **lógica**. El cliente deja de poder rentar,
  pero su historial se conserva y puede reactivarse después.

#### 6.3 Equipos

Muestra el inventario con precio por día, stock, unidades rentadas y unidades
**disponibles**. Se puede buscar por nombre o marca, filtrar por categoría y
marcar **Solo disponibles**.

Con **Nuevo equipo** se captura categoría, nombre, marca, precio y stock. El
botón **Categorías** abre el catálogo para crear, editar o eliminar categorías;
una categoría con equipos asignados no se puede borrar hasta reasignarlos.

> **Disponible** = stock − unidades en rentas activas o reservadas sin devolver.
> Se calcula con la vista `v_equipo_disponible` en cada consulta; no es una
> columna que pueda desincronizarse.

#### 6.4 Rentas

Es el proceso central. La tabla muestra folio, cliente, periodo, estado, total,
pagado, saldo y líneas pendientes de devolución. Arriba se puede filtrar por
estado y por cliente, y el botón **Detalle** abre un panel lateral con todo el
contrato. Las solicitudes pendientes aparecen resaltadas.

#### 6.5 Solicitudes

Es la bandeja de entrada del administrador. Muestra cuántas solicitudes esperan
revisión, su monto y las ya aprobadas. Cada fila permite **Revisar** el detalle,
**Aprobar y reservar** (aparta sin entregar), **Aprobar y entregar** (pasa a
Activa) o **Rechazar** con un motivo que el cliente verá en su portal.

El número del menú **Solicitudes** es el contador de pendientes y se actualiza
solo al aprobar o rechazar.

> Aprobar **revalida el inventario** en ese momento. Si entre la solicitud y la
> aprobación otro cliente ocupó las unidades, el sistema rechaza la aprobación
> con un mensaje y no cambia nada.

#### 6.6 Actividad

Bitácora de todo lo sensible: inicios de sesión, solicitudes, aprobaciones,
rechazos, pagos, devoluciones y cambios de clientes o equipos. Se puede filtrar
por tipo de acción y por entidad. Solo la ve el administrador.

---

### 7. Portal del cliente

El cliente inicia sesión y llega a **Portal del cliente**. Tiene tres pestañas:

#### 7.1 Catálogo

Tarjetas con los equipos disponibles, su precio por día y un botón **Agregar**.
Puede buscar por nombre o marca, filtrar por categoría y ocultar los agotados.

#### 7.2 Nueva solicitud

Arriba eliges las **fechas**; abajo revisas el carrito con cantidades y total
estimado. Al pulsar **Enviar solicitud**:

- la renta nace en estado **Solicitada**,
- **todavía no aparta inventario**: el administrador debe aprobarla,
- el cliente puede seguir viendo el catálogo mientras espera.

#### 7.3 Mis solicitudes

Lista con el estado de cada solicitud, el periodo, el total y lo pagado. El
cliente puede abrir el **Detalle** (equipos, seguimiento y, si la rechazaron, el
motivo) y **Cancelar** mientras siga en `Solicitada`.

Una vez aprobada, ya no puede cancelarla: debe contactar al administrador.

---

### 8. Registrar una renta

> Esta sección es para el **administrador**. El cliente no crea rentas
> directamente: envía solicitudes (ver sección 7).

1. Entra a **Rentas** y pulsa **Nueva renta** (o el botón del panel general).
2. Elige un **cliente activo**. Si no aparece, primero regístralo en Clientes.
3. Confirma la **fecha de inicio** y el **fin estimado**. Los días se calculan
   solos y el fin no puede ser anterior al inicio.
4. Elige el **estado inicial**:
   - **Activa**: el equipo sale del inventario hoy.
   - **Reservada**: queda apartado sin entregarse.
5. Selecciona un equipo (solo aparecen los que tienen unidades libres), indica
   la cantidad y pulsa **Agregar**. Repite para cada equipo de la renta.
6. En el carrito puedes cambiar la cantidad o quitar un renglón. El resumen de la
   derecha muestra días, líneas, unidades y **total estimado**.
7. Pulsa **Crear renta**.

Al guardar, el servidor verifica otra vez que el cliente esté activo, que haya
stock suficiente y calcula el total con el precio **de la base de datos** (el
navegador no envía precios). Si algo falla, aparece el motivo y **no se guarda
nada**; por ejemplo:

> *Stock insuficiente de 'Proyector 4K': se pidieron 3 y solo hay 1 disponibles*

Si todo sale bien, el panel de detalle se abre con el folio asignado y el total.

---

### 9. Aprobar o rechazar solicitudes

Cuando un cliente envía una solicitud, al administrador le aparece un aviso en
el menú **Solicitudes** y una tarjeta en el panel general.

1. Entra a **Solicitudes**.
2. Pulsa **Revisar** en la solicitud pendiente.
3. Revisa cliente, periodo, equipos y total.
4. Elige una salida:
   - **Aprobar y reservar**: los equipos quedan apartados, pero no entregados.
   - **Aprobar y entregar**: la renta pasa a **Activa** de inmediato.
   - **Rechazar**: escribe el motivo (mínimo 3 caracteres). El cliente lo verá
     en su portal.
5. Confirma.

Al aprobar, el servidor revisa otra vez el inventario y aparta las unidades. Si
ya no alcanza el stock, aparece el motivo y **no se modifica nada**. El contador
del menú baja solo.

---

### 10. Cobrar una renta

Desde el detalle de la renta, pulsa **Registrar pago**:

1. El monto aparece precargado con el **saldo pendiente**; puedes reducirlo para
   registrar un abono.
2. Elige el método: **Efectivo**, **Tarjeta** o **Transferencia**.
3. Pulsa **Registrar**.

El pago queda en la lista de la renta y el saldo se actualiza. Cuando el saldo
llega a cero, la columna **Pagado** muestra la etiqueta verde *Pagado*. El
sistema no permite cobrar más de lo que se debe.

> Una solicitud en estado `Solicitada` no se puede cobrar: primero hay que
> aprobarla en **Solicitudes**.

---

### 11. Devolver los equipos

1. Abre el detalle de la renta.
2. En la tabla de equipos, marca las casillas de los renglones que regresan y
   pulsa **Devolver seleccionados**; si regresa todo, usa **Devolver todo**.
3. Confirma la operación.

El sistema guarda la fecha de devolución y repone las unidades al inventario de
inmediato. Cuando ya no queda ningún renglón pendiente, la renta pasa sola a
estado **Finalizada**.

El bloque **Cambiar estado** sirve para corregir manualmente una renta
(Reservada, Activa, Finalizada o Cancelada). **Eliminar renta** borra el
contrato con sus pagos y detalles; si solo quieres anularla conservando el
historial, cámbiala a **Cancelada** en lugar de borrarla.

> En una solicitud `Solicitada`, los pagos y las devoluciones están desactivados
> y el cambio de estado genérico no la puede aprobar. Para eso usa los botones
> **Aprobar y reservar / Aprobar y entregar** del detalle o de la bandeja de
> **Solicitudes**.

---

### 12. Consultar los reportes

Entra a **Reportes**. Arriba están las tarjetas de resumen y debajo siete
pestañas; cada una indica con una etiqueta la técnica SQL que usa (JOIN, filtro,
GROUP BY…).

| Pestaña | Para qué sirve |
|---|---|
| **Pendientes** | Saber qué equipo no ha regresado, quién lo tiene y si ya se retrasó |
| **Ingresos** | Qué categoría de producto deja más dinero, con barras de participación |
| **Estados** | Cuántas rentas hay en cada estado, incluidas las que están en cero |
| **Inventario bajo** | Equipos con menos stock del límite que indiques (5 por omisión) |
| **Vencidas** | Contratos activos o reservados cuya fecha fin ya pasó |
| **Top clientes** | Ranking por monto rentado, con el número de rentas de cada uno |
| **Historial** | Todo lo que ha rentado un cliente que elijas en la lista |

Los porcentajes de las barras se calculan sobre el total de la columna, y los
totales nunca se guardan: se agrupan en el momento con SQL. El botón
**Imprimir** genera una hoja limpia (sin menús ni botones), y **Actualizar**
vuelve a consultar la base.

> Desde el panel general, los botones **Ver** de *rentas vencidas* e *inventario
> agotado* abren directamente la pestaña correspondiente.

---

### 13. Solución de problemas

| Mensaje o síntoma | Causa | Solución |
|---|---|---|
| *"la ejecución de scripts está deshabilitada"* | Política de PowerShell | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| La ventana de PowerShell se cierra al instante | Se ejecutó `Activate.ps1` con doble clic; eso abre una sesión temporal | Abre PowerShell **dentro** de la carpeta y escribe `.\\.venv\\Scripts\\Activate.ps1` |
| *"No se reconoce el término 'uvicorn'"* | El entorno virtual no está activo | Repite `.\.venv\Scripts\Activate.ps1`; la línea debe empezar con `(.venv)` |
| *"No module named app"* | `uvicorn` se ejecutó fuera de `backend` | Entra a `backend` antes de ejecutarlo |
| *"connection refused"* | PostgreSQL no está corriendo | Abre **Servicios** de Windows y verifica `postgresql-x64-18` |
| *"password authentication failed"* | Contraseña incorrecta | Vuelve a ejecutar `python scripts\crear_bd.py` |
| *"database renta_equipos does not exist"* | Falta crear la base | `python scripts\crear_bd.py` |
| El sitio muestra "No se pudo conectar con el servidor" | El servidor está detenido | Ejecuta `uvicorn app.main:app --reload` |
| *"Only one usage of each socket address"* | El puerto 8000 ya está ocupado (otro servidor abierto) | Cierra la otra ventana o usa `--port 8001` |
| Página en blanco | Ruta equivocada | Verifica que sea `http://localhost:8000` |
| El login dice *"Correo o contraseña incorrectos"* | Datos mal escritos o cuenta inexistente | Revisa mayúsculas; el admin puede asignar una nueva contraseña desde **Clientes → Acceso** |
| *"Tu cuenta está desactivada"* | El acceso fue revocado | El admin lo reactiva desde **Clientes → Acceso** |
| El cliente vuelve al login todo el tiempo | Entró por `127.0.0.1` y la API usa `localhost` (o al revés) | Usa siempre el mismo origen: `http://localhost:8000` |
| El cliente ve `403 No tienes permiso` | Está intentando abrir una pantalla de admin | Entra a **Portal** desde su menú; el admin conserva todas las secciones |
| El badge de solicitudes no cambia | No hay pendientes o la sesión es de cliente | Recarga la bandeja; el badge solo existe para admin |

---

### 14. Glosario

- **API**: puerta de entrada al sistema; recibe peticiones y devuelve datos.
- **Backend**: programa en Python que valida las reglas y habla con la base.
- **Frontend**: lo que se ve en el navegador.
- **Endpoint**: cada dirección de la API (`/api/rentas`, `/api/equipos`…).
- **Folio**: número de renta (`id_renta`).
- **Rol**: tipo de cuenta (`admin` o `cliente`); define qué se puede hacer.
- **Sesión**: periodo durante el cual el navegador recuerda que iniciaste sesión.
- **Cookie**: pequeño dato que el navegador guarda para mantener la sesión.
- **Solicitud**: pedido de renta de un cliente; nace en estado `Solicitada`.
- **Aprobar**: decisión del admin que aparta el inventario y activa la renta.
- **Bitácora / auditoría**: registro histórico de quién hizo qué y cuándo.
- **Stock**: unidades totales de un equipo.
- **Disponible**: unidades libres en este momento.
- **JSON**: formato de texto con el que el navegador y el servidor intercambian datos.
- **Trigger**: regla que la base ejecuta sola (por ejemplo, recalcular el total).
- **Vista**: consulta guardada que se usa como si fuera una tabla.

---

*Fin del manual.*

---
<a id="roles"></a>

# Parte 3 — Roles, permisos y sesión

## Roles, permisos y flujo de solicitudes

RentaVisual tiene **dos roles** y una regla central: *el cliente pide, el
administrador aprueba*. Este documento explica cómo está implementado, qué puede
hacer cada rol y cómo comprobarlo.

---

### 1. Los dos roles

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

#### Credenciales de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@rentavisual.mx` | `Admin123!` |
| Cliente (Luis Ramírez) | `luis@rentavisual.mx` | `Cliente123!` |

Se crean al cargar `sql/02_datos.sql`. Cámbialas antes de usar datos reales.

---

### 2. Matriz de permisos

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

### 3. Cómo funciona la sesión

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

#### Contraseñas

- Algoritmo: **PBKDF2-SHA256** (librería estándar de Python).
- 600 000 iteraciones y sal aleatoria de 16 bytes por usuario.
- Formato guardado: `pbkdf2_sha256$600000$<sal>$<hash>`.
- Comparación en tiempo constante (`hmac.compare_digest`).
- Límite de **5 intentos fallidos por minuto** por IP + correo (`429`).

#### Inicio y cierre

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

### 4. El flujo de una solicitud

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

#### Estados

| Estado | Significado | ¿Aparta stock? |
|---|---|---|
| `Solicitada` | El cliente la envió; el admin aún no la revisa | **No** |
| `Reservada` | Aprobada; equipos apartados sin entregar | Sí |
| `Activa` | Aprobada y entregada | Sí |
| `Finalizada` | Todos los equipos fueron devueltos | No |
| `Cancelada` | Rechazada o cancelada | No |

#### Reglas que aplica el backend

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

### 5. Acceso al portal de un cliente existente

Un cliente que ya rentaba en mostrador no tiene cuenta. El admin se la crea:

1. **Clientes** → botón de la llave en la fila.
2. Escribe correo, contraseña (mínimo 8 caracteres) y, si quiere, un nombre para
   mostrar.
3. Guarda. El cliente ya puede entrar al portal y ver **solo sus** solicitudes.

Si el cliente olvida la contraseña, el admin vuelve a guardar el acceso con una
nueva. **Revocar acceso** desactiva la cuenta sin borrarla: el historial se
conserva y se puede reactivar después.

#### Auto-registro

En `login.html` hay una pestaña **Crear cuenta**. Crea la ficha de cliente y la
cuenta en una sola transacción. Si el correo ya pertenece a un cliente
registrado, se rechaza y se pide al admin que otorgue el acceso (así nadie se
adueña de un historial ajeno).

---

### 6. Bitácora de auditoría

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

### 7. Base de datos

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

#### Consultas útiles

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

### 8. Cómo probarlo

#### Con el navegador

1. Abre `http://localhost:8000` → debe llevar a `login.html`.
2. Entra como **cliente** (`luis@rentavisual.mx` / `Cliente123!`).
3. Agrega un equipo, elige fechas y envía la solicitud.
4. Cierra sesión y entra como **admin** (`admin@rentavisual.mx` / `Admin123!`).
5. El navbar muestra el badge de solicitudes. Abre **Solicitudes**, revisa y
   aprueba como `Reservada`.
6. Verifica en **Equipos** que la disponibilidad bajó y en **Actividad** que
   quedó el registro.

#### Con la API (PowerShell)

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

### 9. Errores frecuentes

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

---
<a id="api"></a>

# Parte 4 — Contrato de la API

## Contrato de la API

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

### Autenticación

#### `POST /auth/login`
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

#### `POST /auth/registro` (público)
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

#### `POST /auth/logout`
Borra la cookie. Responde `{ "ok": true }`. No requiere cuerpo.

#### `GET /auth/yo`
Devuelve el perfil de la sesión actual. 401 si no hay sesión. Es lo que usa el
front para decidir qué navbar pintar.

#### `PUT /auth/password`
```json
{ "actual": "ClaveVieja1", "nueva": "ClaveNueva1" }
```
401 si la contraseña actual no coincide; 400 si la nueva es igual a la actual.

---

### Sistema

#### `GET /salud`
```json
{ "estado": "ok", "base": "renta_equipos", "version": "PostgreSQL 18..." }
```

#### `GET /estados`
```json
[ { "id_estado": 1, "estado": "Reservada" }, ... ]
```

---

### Categorías

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

### Clientes

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

#### `POST /clientes/{id}/acceso`
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

#### `DELETE /clientes/{id}/acceso`
Desactiva la cuenta sin borrarla: el cliente conserva historial y la cuenta se
puede reactivar después con `POST /clientes/{id}/acceso`.

---

### Equipos

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

### Rentas (proceso central)

> **Visibilidad:** el cliente solo ve sus propias rentas. `GET /rentas` filtra por
> `usuario.id_cliente` en el servidor y `GET /rentas/{id}` responde **404** si la
> renta es de otro cliente (no 403, para no revelar que existe).

#### `GET /rentas?estado=Activa&id_cliente=1`

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

#### `GET /rentas/pendientes/conteo` (solo admin)
```json
{ "pendientes": 2 }
```
Es el número del badge de la bandeja de solicitudes.

#### `GET /rentas/{id}`

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

#### `POST /rentas` ← **crear renta o solicitud**

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

#### `POST /rentas/{id}/aprobar` (solo admin)
```json
{ "estado": "Reservada" }
```
`estado`: `Reservada` (apartar) o `Activa` (entregar de inmediato), por defecto
`Reservada`.

- Solo aplica a rentas en estado `Solicitada` (409 en cualquier otro).
- **Revalida el stock en ese instante**; si ya no alcanza, responde 409 y no
  cambia nada.
- Guarda quién aprobó y cuándo, y deja registro en `auditoria`.

#### `POST /rentas/{id}/rechazar` (solo admin)
```json
{ "motivo": "No hay disponibilidad para esas fechas" }
```
Pasa la solicitud a `Cancelada` sin tocar inventario y guarda el motivo, que el
cliente ve en su portal. `motivo` exige entre 3 y 500 caracteres.

#### `POST /rentas/{id}/cancelar`
- **Cliente:** solo puede cancelar **sus propias** rentas en estado `Solicitada`.
- **Admin:** puede cancelar rentas `Solicitada`, `Reservada` o `Activa`.
- Cualquier otro estado responde 409.
- No borra la renta: la deja `Cancelada` con su historial.

#### `PATCH /rentas/{id}/estado` (solo admin)
```json
{ "estado": "Cancelada" }
```
Valores: `Reservada`, `Activa`, `Finalizada`, `Cancelada`.

> Este cambio es administrativo y **no** revalida stock. Para pasar una
> `Solicitada` a `Reservada`/`Activa` hay que usar `/aprobar`; el backend
> responde `409` si se intenta por aquí (conflicto de estado).

#### `POST /rentas/{id}/devoluciones`
```json
{ "fecha_devolucion": "2026-11-06", "id_detalles": [1, 2] }
```

- Si omites `id_detalles`, devuelve **todas** las líneas pendientes.
- Si omites `fecha_devolucion`, usa la fecha de hoy.
- Cuando ya no queda ninguna pendiente, la renta pasa sola a `Finalizada`.
- Responde 409 si no había nada pendiente.

#### `DELETE /rentas/{id}` (solo admin)
Elimina la renta; detalles y pagos se borran en cascada. Al borrar una renta que
ocupaba stock, la vista de disponibilidad se actualiza sola. Si solo quieres
anularla conservando el historial, usa `/cancelar` en lugar de borrar.

---

### Pagos

> Los pagos están bloqueados para rentas en estado `Solicitada` o `Cancelada`
> (409): primero hay que aprobar la solicitud.

#### `GET /rentas/{id}/pagos`

#### `POST /rentas/{id}/pagos`
```json
{ "monto_pagado": 1500.00, "metodo_pago": "Transferencia" }
```
`metodo_pago`: `Efectivo` | `Tarjeta` | `Transferencia`.
Responde 409 si la suma de pagos supera `monto_total`.

---

### Auditoría (solo admin)

#### `GET /auditoria?accion=&entidad=&limite=50&offset=0`
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

#### `GET /auditoria/acciones`
Lista las acciones distintas registradas, para llenar el filtro del front:
```json
["aprobar_solicitud", "cancelar_renta", "login", "solicitar_renta"]
```

---

### Reportes

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

#### `GET /reportes/resumen`
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

### Uso desde JavaScript

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

---
<a id="frontend"></a>

# Parte 5 — Guía del frontend

## Guía del frontend

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

### Cómo abrirlo

#### Opción recomendada: con el backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Abre <http://localhost:8000/>. FastAPI sirve la carpeta `frontend/`, así que el
sitio y la API comparten origen (`/api`) y no hay problemas de CORS.

#### Opción para maquetar: Live Server

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

### Reglas de oro

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

### Sesión y roles

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

#### Guards declarativos

| Atributo en `<body>` | Efecto |
|---|---|
| `data-solo-admin="true"` | Si el rol no es `admin`, redirige a `portal.html` |
| `data-solo-cliente="true"` | Si el rol no es `cliente`, redirige a `index.html` |

Así se declaran las pantallas de admin y el portal del cliente. Para una página
nueva, agrega el atributo que corresponda.

#### Sesión en `api.js`

`Api` envía `credentials: "include"` en todas las llamadas. Si el backend
responde 401 y no estás en `login.html`, limpia y redirige al login. No hay que
manejar el 401 en cada pantalla.

---

### La capa compartida

#### `api.js` — un método por endpoint

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

#### `comun.js` — todo lo repetido

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

### Dónde tocar el diseño

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

### Cómo agregar una pantalla

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

### Qué consume cada pantalla

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

### Problemas comunes

| Síntoma | Causa / solución |
|---|---|
| "No se pudo conectar con el servidor" | El backend no está corriendo en el puerto 8000 |
| Funciona en `localhost:8000` pero no en Live Server | Falta el backend, o el puerto no es 5500/5501/8080: ajústalo en `api.js` |
| Los cambios de CSS no se ven | Recarga forzada (`Ctrl + F5`); el navegador cachea |
| Un `select` aparece vacío | La petición que lo llena falló: mira la consola y el toast de error |
| Un reporte dice "No se pudo cargar" | Revisa que el backend siga vivo y que la base tenga el esquema actualizado |
| Al imprimir salen botones | Falta la clase `no-print` en el elemento nuevo |

---

### Antes de entregar

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

---
<a id="como-funciona"></a>

# Parte 6 — Cómo funciona (explicación técnica)

## Cómo funciona el proyecto (guía de estudio)

Documento para entender **qué se construyó y por qué**. Está pensado para
alguien de 5.º semestre que ya programa en Python pero no ha hecho una
aplicación web completa con base de datos.

---

### 1. Panorama general: tres capas

```
┌──────────────────┐        HTTP + JSON        ┌──────────────────┐
│   NAVEGADOR      │  ───────────────────────▶ │   BACKEND        │
│   (frontend)     │  ◀─────────────────────── │   (Python)       │
│   HTML/CSS/JS    │                           │   FastAPI        │
└──────────────────┘                           └────────┬─────────┘
                                                        │ SQL
                                                        ▼
                                               ┌──────────────────┐
                                               │  PostgreSQL 18   │
                                               │  (datos)         │
                                               └──────────────────┘
```

| Capa | Archivos | Responsabilidad |
|---|---|---|
| Frontend | `frontend/` | Mostrar información y capturar datos |
| Backend | `backend/app/` | Validar reglas de negocio y hablar con la BD |
| Base de datos | `sql/` | Guardar y proteger la integridad de los datos |

**Regla de oro:** el navegador **nunca** se conecta directo a PostgreSQL.
Si lo hiciera, la contraseña de la base viajaría en el JavaScript y cualquiera
podría leerla con *F12*. Por eso existe el backend: es el único que conoce la
contraseña.

---

### 2. El viaje de una petición

Ejemplo real: el usuario crea una renta.

```
 1. El navegador ejecuta:
        fetch("http://localhost:8000/api/rentas", {
          method: "POST",
          body: JSON.stringify({ id_cliente: 2, detalles: [...] })
        })

 2. FastAPI recibe la petición y busca la ruta POST /api/rentas
    → la encuentra en backend/app/routers/rentas.py

 3. Pydantic valida el JSON contra el modelo RentaCreate
    → si falta un campo o la fecha está mal, responde 422 y no sigue

 4. La función crear() pide una conexión a la base (Depends(get_db))

 5. Dentro de una transacción:
      - consulta el cliente
      - por cada equipo: bloquea la fila y verifica disponibilidad
      - calcula subtotales
      - INSERT en renta y en detalle_renta

 6. PostgreSQL ejecuta el trigger y recalcula monto_total

 7. COMMIT: los cambios quedan guardados de forma permanente

 8. FastAPI responde 201 con la renta completa en JSON

 9. El navegador recibe el JSON y actualiza la pantalla
```

Si en el paso 5 algo falla (stock insuficiente), se hace **ROLLBACK** y la base
queda exactamente como estaba. Eso es una **transacción**: todo o nada.

---

### 3. El backend explicado

#### 3.1 ¿Qué es el entorno virtual (`.venv`)?

Una carpeta con una copia privada de Python y sus librerías. Sirve para que las
dependencias de este proyecto no choquen con las de otros.

| Comando | Qué hace |
|---|---|
| `python -m venv .venv` | Crea el entorno |
| `.\.venv\Scripts\Activate.ps1` | Lo activa (la línea pasa a empezar con `(.venv)`) |
| `pip install -r requirements.txt` | Instala las librerías listadas |
| `deactivate` | Sale del entorno |

`Activate.ps1` **no se ejecuta con doble clic**. Abre una sesión temporal que se
cierra al terminar. Hay que escribir el comando dentro de una terminal ya
abierta.

#### 3.2 Las librerías

| Librería | Para qué |
|---|---|
| **FastAPI** | Crear la API: rutas, validación, documentación automática |
| **Uvicorn** | El servidor que mantiene la aplicación escuchando en un puerto |
| **psycopg** | El "traductor" entre Python y PostgreSQL |
| **psycopg_pool** | Reutiliza conexiones en vez de abrir una por petición |
| **Pydantic** | Valida los datos que llegan del navegador |
| **python-dotenv** | Lee el archivo `.env` con la contraseña |

#### 3.3 Rutas y decoradores

```python
router = APIRouter(prefix="/clientes", tags=["Clientes"])

@router.get("")
def listar(db=Depends(get_db)):
    ...
```

El `@router.get("")` **registra** la función: le dice a FastAPI
"cuando llegue un GET a `/api/clientes`, ejecuta esta función y devuelve lo que
retorne". Un decorador en Python es una función que envuelve a otra; aquí se usa
para declarar configuración sin escribir `if`.

El valor que retorna la función se convierte solo a JSON. Si devuelves una lista
de diccionarios, el navegador recibe una lista JSON.

#### 3.4 Inyección de dependencias: `Depends(get_db)`

```python
def get_db():
    with pool.connection() as conn:
        yield conn
```

- `yield` convierte la función en un **generador**: entrega la conexión, el
  endpoint la usa, y cuando termina la ejecución continúa después del `yield`
  para devolverla al pool.
- `Depends(get_db)` le dice a FastAPI: "antes de ejecutar el endpoint, llama a
  `get_db` y pásame el resultado en el parámetro `db`".

Ventaja: ningún endpoint abre ni cierra conexiones a mano, y si hay un error se
hace `ROLLBACK` automáticamente.

#### 3.5 `with`: context managers

```python
with db.cursor() as cur:
    cur.execute("SELECT ...")
```

`with` garantiza que el cursor se cierre aunque ocurra una excepción. Es el
equivalente a `try/finally`, pero más limpio.

#### 3.6 `with db.transaction():`

Marca un bloque atómico. Si el bloque termina bien → `COMMIT`. Si lanza
cualquier excepción → `ROLLBACK`. Por eso `crear()` puede insertar una renta y
luego fallar en el tercer equipo sin dejar basura.

#### 3.7 Pydantic: validar antes de tocar la base

```python
class DetalleCreate(BaseModel):
    id_equipo: int
    cantidad: int = Field(gt=0)
```

Con solo declarar los tipos, FastAPI:

- rechaza peticiones sin `id_equipo` (responde 422),
- rechaza `cantidad: 0` o negativa,
- convierte `"2026-11-03"` en un objeto `date`,
- **documenta los campos automáticamente** en `/docs`.

```python
@model_validator(mode="after")
def _validar_fechas(self):
    if self.fecha_fin_estimada < self.fecha_inicio:
        raise ValueError("La fecha fin no puede ser anterior al inicio")
    return self
```

Ese validador es una regla de negocio que se ejecuta **antes** de llegar a SQL.

#### 3.8 Manejo de errores

En `main.py` hay *exception handlers* que atrapan los errores de PostgreSQL y
los traducen:

```python
@app.exception_handler(pg_errors.ForeignKeyViolation)
```

Así el front no recibe `violates foreign key constraint "fk_detalle_equipo"`
sino `"No se puede completar la operación: el registro está siendo usado..."`.

Es buena práctica: los mensajes técnicos van al log, los entendibles al usuario.

---

### 4. La base de datos explicada

#### 4.1 Llaves

| Concepto | Qué es | En el proyecto |
|---|---|---|
| **PK** (Primary Key) | Identifica de forma única una fila | `equipo.id_equipo` |
| **FK** (Foreign Key) | Apunta a la PK de otra tabla y obliga a que exista | `renta.id_cliente → cliente.id_cliente` |
| **UNIQUE** | No permite valores repetidos | `cliente.email` |
| **CHECK** | Condición que todo valor debe cumplir | `cantidad > 0` |
| **NOT NULL** | Obligatorio | `equipo.nombre` |

`GENERATED ALWAYS AS IDENTITY` es la forma moderna de autoincrementar
(sustituye a `SERIAL`).

Una FK **impide** datos huérfanos: no puedes crear una renta para un cliente que
no existe, ni borrar un equipo que está dentro de una renta.

#### 4.2 La relación N:M

Un cliente renta **muchos** equipos y un equipo puede estar en **muchas**
rentas. Eso es N:M, y SQL no lo permite directamente: hay que partirlo en dos
relaciones 1:N con una **tabla intermedia**.

```
RENTA ──1:N──▶ DETALLE_RENTA ◀──N:1── EQUIPO
```

`DETALLE_RENTA` no es solo un puente: guarda los datos **propios de la
relación**, que es justo lo que pide el proyecto:

| Columna | Por qué vive ahí y no en EQUIPO |
|---|---|
| `cantidad` | Es cuántas unidades van en *esta* renta |
| `fecha_devolucion` | Es cuándo regresó *esta* unidad en *esta* renta |
| `precio_unitario` | El precio puede cambiar con el tiempo; se congela al rentar |
| `subtotal` | Resultado del renglón |

`UNIQUE (id_renta, id_equipo)` evita poner dos veces el mismo equipo en una
renta: si quieres 3, se usa `cantidad = 3`.

#### 4.3 Los JOIN

Un `JOIN` combina filas de dos tablas usando una columna en común.

```sql
SELECT c.nombre_completo, e.nombre
FROM detalle_renta d
JOIN renta   r ON r.id_renta  = d.id_renta
JOIN cliente c ON c.id_cliente = r.id_cliente
JOIN equipo  e ON e.id_equipo  = d.id_equipo
WHERE d.fecha_devolucion IS NULL;
```

Lectura: "toma cada renglón de `detalle_renta`, búscale su renta, luego su
cliente y luego su equipo, y quédate solo con los que no se han devuelto".

| Tipo | Qué conserva |
|---|---|
| `INNER JOIN` (o `JOIN`) | Solo filas que coinciden en ambas tablas |
| `LEFT JOIN` | Todas las de la izquierda, aunque no tengan pareja (rellena con `NULL`) |

Por eso el reporte "rentas por estado" usa `LEFT JOIN`: si un estado no tiene
rentas, igual debe aparecer con `0`.

#### 4.4 `GROUP BY` y funciones de agregación

```sql
SELECT cat.nombre_categoria, SUM(d.subtotal) AS ingresos
FROM categoria cat
JOIN equipo e        ON e.id_categoria = cat.id_categoria
JOIN detalle_renta d ON d.id_equipo    = e.id_equipo
GROUP BY cat.nombre_categoria;
```

`GROUP BY` agrupa filas que comparten valor; `SUM`, `COUNT`, `AVG` calculan un
resultado por grupo. Regla: **toda columna del `SELECT` que no esté dentro de
una agregación debe estar en el `GROUP BY`**.

El `FILTER` que aparece en la vista es una versión más legible de
`SUM(CASE WHEN ... THEN ... END)`:

```sql
SUM(d.cantidad) FILTER (WHERE d.fecha_devolucion IS NULL)
```

#### 4.5 Vistas

```sql
CREATE VIEW v_equipo_disponible AS SELECT ...;
```

Una vista es una consulta guardada con nombre de tabla. Aquí resuelve un
problema de diseño: **el stock disponible no se guarda, se calcula**.

Si guardáramos una columna `disponible` y la descontáramos a mano, tarde o
temprano quedaría mal (una devolución no registrada, una renta cancelada, un
error). Calculándola siempre a partir de los datos reales, es imposible que se
desincronice.

#### 4.6 Triggers

```sql
CREATE TRIGGER trg_detalle_monto
AFTER INSERT OR UPDATE OR DELETE ON detalle_renta
FOR EACH ROW EXECUTE FUNCTION fn_recalcular_monto_renta();
```

Un trigger es código que la base ejecuta **sola** cuando pasa algo. Aquí:

- cada vez que se agrega, cambia o borra un renglón, recalcula `monto_total`.
- antes de guardar una devolución, verifica que no sea anterior al inicio.

Ventaja: la regla se cumple **aunque el dato se inserte desde pgAdmin**, no solo
desde la aplicación. La integridad no depende del front.

#### 4.7 Transacciones y `FOR UPDATE`

```python
with db.transaction():
    cur.execute("SELECT ... FROM equipo WHERE id_equipo = %s FOR UPDATE", (id,))
```

`FOR UPDATE` bloquea la fila hasta que la transacción termine. Escenario real:
dos empleados rentan al mismo tiempo la última bocina.

- Sin bloqueo: ambos leen "disponible = 1", ambos insertan, y quedan 2 rentadas
  de 1 que existe.
- Con bloqueo: el segundo espera a que el primero confirme, vuelve a leer y ve
  "disponible = 0", así que recibe un error claro.

Es la diferencia entre un sistema que "funciona en la demo" y uno correcto.

#### 4.8 Consultas parametrizadas (`%s`)

```python
cur.execute("SELECT * FROM cliente WHERE email = %s", (email,))
```

**Nunca** se arma el SQL con concatenación de textos:

```python
# MAL: vulnerable a inyección SQL
cur.execute("SELECT * FROM cliente WHERE email = '" + email + "'")
```

Con `%s`, psycopg manda el valor por un canal separado y PostgreSQL jamás lo
interpreta como instrucción. Así se evita la **inyección SQL**, el ataque web
más común.

---

### 5. Cómo se conecta el front

#### 5.1 `fetch`

```js
const respuesta = await fetch("http://localhost:8000/api/equipos");
const equipos = await respuesta.json();
```

`fetch` es la función del navegador para hacer peticiones HTTP. `await` espera
la respuesta sin bloquear la página.

El archivo `frontend/assets/js/api.js` envuelve todo eso: revisa el código HTTP,
parsea el JSON, lanza un `Error` con el mensaje del backend y ofrece atajos como
`Api.rentas.crear(datos)`.

#### 5.2 JSON

El formato de intercambio. Un objeto de Python se convierte en JSON y viceversa:

```python
{"id_equipo": 1, "nombre": "Proyector 4K"}   # Python / JSON
```

#### 5.3 CORS

El navegador bloquea peticiones entre orígenes distintos por seguridad. Si el
front se abre desde `localhost:5500` (Live Server) y la API está en
`localhost:8000`, son orígenes distintos.

Por eso `main.py` declara:

```python
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, ...)
```

En la entrega final no hace falta: FastAPI sirve el front en el mismo puerto
(`app.mount("/", StaticFiles(...))`), así que todo es un solo origen.

---

### 6. Por dónde leer el código (orden recomendado)

1. `sql/01_esquema.sql` — entiende las tablas antes que nada.
2. `sql/02_datos.sql` — mira datos concretos.
3. `backend/app/schemas.py` — qué datos acepta el sistema.
4. `backend/app/routers/clientes.py` — el CRUD más simple.
5. `backend/app/routers/rentas.py` — el proceso central, con transacción.
6. `backend/app/main.py` — cómo se ensambla todo.
7. `backend/app/routers/reportes.py` — las consultas de la rúbrica.
8. `frontend/assets/js/api.js` y `frontend/index.html` — el consumo desde el navegador.

#### Ejercicios para practicar

1. Agrega un campo `direccion` a `cliente` (ALTER TABLE + schema + endpoint).
2. Crea un endpoint que devuelva el total rentado por mes
   (`DATE_TRUNC('month', fecha_inicio)` + `GROUP BY`).
3. Haz que una renta no pueda cancelarse si ya tiene pagos registrados.
4. Agrega un reporte de equipos que nunca se han rentado (`LEFT JOIN` +
   `IS NULL`).
5. Rompe algo a propósito: intenta rentar 999 proyectores desde Swagger y lee
   el mensaje de error.

---

### 7. Errores conceptuales frecuentes

| Error | Por qué está mal |
|---|---|
| Conectar el front directo a PostgreSQL | Expone la contraseña y salta las reglas de negocio |
| Guardar el precio que manda el navegador | El usuario puede modificarlo; el precio se lee de la BD |
| Usar `float` para dinero | Los decimales binarios pierden centavos; se usa `NUMERIC` |
| Concatenar SQL | Inyección SQL |
| Guardar el stock "disponible" como columna | Se desincroniza; mejor una vista calculada |
| `DELETE` en clientes con historial | Se pierde la trazabilidad; se usa baja lógica |
| Validar solo en el front | Cualquiera puede saltarse el front con `curl` |

---
<a id="desde-cero"></a>

# Parte 7 — Manual de construcción desde cero

## Manual para construirlo desde cero

Este documento explica **cómo se hace todo esto a mano**: el orden de las
decisiones, qué escribir en cada paso y cómo comprobar que va bien antes de
seguir.

No es una lista de comandos para copiar. Cada fase termina en un
**Checkpoint**: si no pasa, no avances. Así se programa de verdad: en pasos
pequeños que se pueden verificar.

> El proyecto ya está hecho. La mejor forma de usar este manual es **rehacerlo
> en una carpeta nueva** (`C:\dev\practica\renta`) sin mirar el código original
> salvo cuando te atores. Reconstruir algo que ya sabes que funciona es el
> ejercicio más eficiente que existe.

---

### Fase 0 — Comprobar las herramientas

#### 0.1 Verificar que todo está instalado

```powershell
python --version                  # Python 3.11 o superior
Get-Service postgresql-x64-18     # debe decir Running
```

`psql` no está en el PATH, así que usa la ruta completa:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --version
```

> Regla: si un comando "no se reconoce", el programa no está en el PATH.
> Se soluciona usando la ruta completa o agregando la carpeta `bin` al PATH.

#### 0.2 Entender PowerShell (5 minutos que ahorran horas)

| Situación | Qué hacer |
|---|---|
| La ruta tiene espacios | Entre comillas: `cd "C:\Mi Carpeta"` |
| "la ejecución de scripts está deshabilitada" | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Quieres saber dónde estás | `Get-Location` o `pwd` |
| Ver archivos, incluidos ocultos | `Get-ChildItem -Force` |
| Un comando no se reconoce | `Get-Command nombre` |

El `>` en la documentación significa "escribe esto en la terminal". No lo
copies.

**Checkpoint 0:** `python --version` responde y el servicio de PostgreSQL está
`Running`.

---

### Fase 1 — Diseñar antes de escribir SQL

Esta es la fase que más se salta la gente y la que más caro sale. **No abras
pgAdmin todavía.** Lápiz y papel.

#### 1.1 Sacar las entidades (los sustantivos)

Lee el planteamiento y subraya los sustantivos que representan *cosas que el
sistema debe recordar*:

> "Se rentan **equipos** audiovisuales a **clientes**. Cada equipo pertenece a
> una **categoría**. Una renta puede incluir varios equipos, y de cada uno se
> guarda la **cantidad** y la **fecha de devolución**. Las rentas tienen un
> **estado**. Los clientes hacen **pagos**."

| Sustantivo | ¿Es tabla? | Por qué |
|---|---|---|
| equipo | ✅ EQUIPO | Tiene datos propios (marca, precio, stock) |
| cliente | ✅ CLIENTE | Tiene datos propios |
| categoría | ✅ CATEGORIA | Se repite mucho: conviene catalogarla |
| renta | ✅ RENTA | Es el hecho principal |
| estado | ✅ ESTADO_RENTA | Catálogo de valores permitidos |
| pago | ✅ PAGO | Dato propio, varias filas por renta |
| cantidad | ❌ | Es un **atributo** de la relación |
| fecha de devolución | ❌ | Es un atributo de la relación |

Regla práctica: **un sustantivo es tabla si tiene atributos propios y puede
repetirse muchas veces**.

#### 1.2 Encontrar la relación N:M

Pregunta clave: *¿puede un equipo aparecer en muchas rentas?* Sí.
*¿Y una renta tener muchos equipos?* Sí. → **N:M**.

SQL no modela N:M directamente. Se rompe en dos relaciones 1:N con una tabla
intermedia:

```
RENTA 1 ──── N DETALLE_RENTA N ──── 1 EQUIPO
```

Y esa tabla intermedia **no es solo un puente**: ahí viven `cantidad` y
`fecha_devolucion`, que son datos de *la relación*, no del equipo. Ese es el
punto exacto que pide el proyecto.

#### 1.3 Elegir los tipos de dato

| Dato | Tipo | Por qué NO otro |
|---|---|---|
| Dinero | `NUMERIC(10,2)` | `FLOAT` pierde centavos (0.1 + 0.2 ≠ 0.3) |
| Fechas sin hora | `DATE` | `TIMESTAMP` sobra |
| Fecha de registro | `TIMESTAMPTZ` | Guarda zona horaria |
| Texto corto | `VARCHAR(n)` | `TEXT` no limita |
| Booleano | `BOOLEAN` | Mejor que `'S'/'N'` |
| Identificador | `INTEGER GENERATED ALWAYS AS IDENTITY` | Es el estándar actual; `SERIAL` es de la vieja escuela |

#### 1.4 Detectar las restricciones

Pregúntate: *¿qué dato sería absurdo?*

| Absurdo | Restricción |
|---|---|
| Precio negativo | `CHECK (precio >= 0)` |
| Rentar cantidad 0 | `CHECK (cantidad > 0)` |
| Devolver antes de rentar | Trigger (cruza tablas) |
| Dos clientes con el mismo correo | `UNIQUE` |
| Renta sin cliente válido | `FOREIGN KEY` |
| Total que no cuadra con el detalle | Trigger |

**Checkpoint 1:** tienes 7 tablas dibujadas a mano, con sus flechas 1:N y la
N:M resuelta. Sin computadora.

---

### Fase 2 — Crear la base y el esquema

#### 2.1 Crear la base

En pgAdmin: clic derecho en *Databases* → **Create → Database** → `renta_equipos`.

O por consola:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE renta_equipos;"
```

#### 2.2 Orden de creación

**Primero las tablas que no dependen de nadie.** Si creas `renta` antes que
`cliente`, la FK falla porque la tabla referenciada no existe.

```
1. categoria        (no depende de nada)
2. cliente          (no depende de nada)
3. estado_renta     (no depende de nada)
4. equipo           (depende de categoria)
5. renta            (depende de cliente y estado_renta)
6. detalle_renta    (depende de renta y equipo)
7. pago             (depende de renta)
```

#### 2.3 Escribir una tabla completa, con todo justificado

```sql
CREATE TABLE equipo (
    id_equipo           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_categoria        INTEGER NOT NULL,
    nombre              VARCHAR(100) NOT NULL,
    marca               VARCHAR(50),
    precio_renta_diario NUMERIC(10,2) NOT NULL CHECK (precio_renta_diario >= 0),
    stock               INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),

    CONSTRAINT fk_equipo_categoria
        FOREIGN KEY (id_categoria) REFERENCES categoria (id_categoria)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT uq_equipo_nombre_marca UNIQUE (nombre, marca)
);
```

Léelo así:

- `NOT NULL` → el dato es obligatorio.
- `DEFAULT 0` → si no lo mandan, vale 0.
- `CHECK` → el motor rechaza valores absurdos, aunque vengan de pgAdmin.
- `FOREIGN KEY` → obliga a que la categoría exista.
- `ON DELETE RESTRICT` → no puedes borrar una categoría que tenga equipos.
  (Si fuera `CASCADE`, borrar una categoría borraría sus equipos: casi nunca
  quieres eso.)
- `UNIQUE (nombre, marca)` → no puede haber dos "Proyector 4K Epson".

#### 2.4 Nombrar las restricciones

Nombrarlas (`CONSTRAINT fk_equipo_categoria`) no es decoración: cuando
PostgreSQL lanza un error, lo identifica por ese nombre, y el backend lo usa
para responder un mensaje entendible. Sin nombre, el motor inventa uno como
`equipo_id_categoria_fkey` y el mensaje queda genérico.

**Checkpoint 2:** en pgAdmin, `SELECT * FROM equipo;` funciona; `\d equipo` (o
la pestaña *Constraints*) muestra PK, FK, CHECK y UNIQUE.

---

### Fase 3 — Datos de prueba

Inserta pocos datos pero **coherentes**. No sirve un total de 1700 si el
detalle suma 3400: el profesor lo va a revisar.

#### 3.1 El truco de los IDs manuales

Si escribes `id_equipo = 1` en un `INSERT`, la secuencia interna sigue en 1 y el
siguiente `INSERT` automático choca. Se resuelve así:

```sql
INSERT INTO equipo (id_equipo, nombre, ...) OVERRIDING SYSTEM VALUE VALUES (1, ...);

SELECT setval(pg_get_serial_sequence('equipo','id_equipo'),
              (SELECT MAX(id_equipo) FROM equipo));
```

Alternativa más simple: **no pongas IDs** y referencia por nombre en las FKs.
Más verboso, menos errores.

**Checkpoint 3:** `SELECT COUNT(*) FROM equipo;` devuelve 4 y la suma de los
subtotales coincide con `monto_total` de cada renta.

---

### Fase 4 — Las consultas

No empieces por el SQL. Empieza por la **pregunta**:

> "Quiero ver qué equipos no se han devuelto, de qué cliente y con qué teléfono."

#### 4.1 Método en 5 pasos

1. **¿Qué columnas salen?** → `cliente, telefono, equipo, cantidad`.
2. **¿En qué tablas están?** → `cliente`, `detalle_renta`, `equipo`.
3. **¿Cómo se conectan?** → `detalle_renta → renta → cliente` y
   `detalle_renta → equipo`. Necesitas `renta` de puente aunque no muestres
   columnas suyas.
4. **¿Qué filtro?** → `fecha_devolucion IS NULL`.
5. **¿Orden?** → por fecha comprometida.

```sql
SELECT c.nombre_completo AS cliente, c.telefono,
       e.nombre AS equipo, d.cantidad
FROM detalle_renta d
JOIN renta   r ON r.id_renta   = d.id_renta
JOIN cliente c ON c.id_cliente = r.id_cliente
JOIN equipo  e ON e.id_equipo  = d.id_equipo
WHERE d.fecha_devolucion IS NULL
ORDER BY r.fecha_fin_estimada;
```

#### 4.2 Si la consulta no trae filas

No es un error de sintaxis, es un error de **lógica**. Ve quitando piezas:

1. `SELECT * FROM detalle_renta;` → ¿hay datos?
2. Agrega un JOIN a la vez → ¿en cuál desaparecen las filas?
3. Revisa el `WHERE`.

#### 4.3 Para agrupar

Cuando la pregunta lleva "por": *ingresos **por** categoría*, *rentas **por**
estado*.

```sql
SELECT cat.nombre_categoria, SUM(d.subtotal) AS ingresos
FROM categoria cat
JOIN equipo        e ON e.id_categoria = cat.id_categoria
JOIN detalle_renta d ON d.id_equipo    = e.id_equipo
GROUP BY cat.nombre_categoria;
```

Regla: toda columna del `SELECT` que no esté dentro de `SUM`/`COUNT`/`AVG`
debe ir en el `GROUP BY`.

Si quieres que aparezcan categorías con cero, usa `LEFT JOIN` desde la tabla
catálogo.

**Checkpoint 4:** las 8 consultas corren y devuelven números que puedes
explicar. Si no sabes por qué una fila está ahí, no está terminada.

---

### Fase 5 — Vista y triggers (cuando lo básico ya funciona)

**Nunca empieces por aquí.** Primero haz que las tablas y consultas funcionen.

#### 5.1 ¿Por qué una vista?

El stock disponible es una **restricción de integridad**: si lo guardas como
columna y lo actualizas a mano, algún día se desincroniza. Calculándolo siempre
desde los datos reales, es imposible que quede mal.

```sql
CREATE VIEW v_equipo_disponible AS
SELECT e.id_equipo, e.nombre, e.stock,
       e.stock - COALESCE(SUM(d.cantidad) FILTER (
           WHERE d.fecha_devolucion IS NULL
             AND er.estado IN ('Reservada','Activa')), 0) AS disponible
FROM equipo e
LEFT JOIN detalle_renta d ON d.id_equipo = e.id_equipo
LEFT JOIN renta r         ON r.id_renta  = d.id_renta
LEFT JOIN estado_renta er ON er.id_estado = r.id_estado
GROUP BY e.id_equipo;
```

Detalle clave: `LEFT JOIN` + `FILTER`. Con `JOIN` normal, un equipo que nunca
se ha rentado **desaparecería** de la vista.

#### 5.2 ¿Por qué un trigger?

Porque hay reglas que deben cumplirse **aunque el dato no venga de la
aplicación**. Si alguien inserta desde pgAdmin, el trigger igual se ejecuta.

**Checkpoint 5:** rentas un equipo a mano en pgAdmin y el `disponible` baja; lo
devuelves y sube.

---

### Fase 6 — El proyecto Python

#### 6.1 Entorno virtual

```powershell
mkdir renta\backend
cd renta\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

La línea ahora empieza con `(.venv)`. Si no, no instales nada: se iría a tu
Python global.

#### 6.2 Dependencias

Crea `requirements.txt` y luego:

```powershell
pip install -r requirements.txt
```

No instales con `pip install fastapi` a secas: dentro de un mes no recordarás
qué versión usaste.

#### 6.3 El `.env`

```
DATABASE_URL=postgresql://postgres:TU_CONTRASENA@localhost:5432/renta_equipos
SECRET_KEY=una-cadena-larga-y-aleatoria
```

Ese archivo **nunca** va a Git. Se comparte `.env.example` sin contraseña.
`SECRET_KEY` firma la cookie de sesión: si la cambias, se cierran todas las
sesiones abiertas.

#### 6.4 Primera conexión (antes de FastAPI)

No empieces por el CRUD. Escribe `probar_conexion.py`:

```python
import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
    print(conn.execute("SELECT current_database(), version()").fetchone())
```

**Checkpoint 6:** ese script imprime el nombre de la base. Si falla aquí, no
tiene sentido escribir endpoints.

---

### Fase 7 — La API, de menos a más

#### 7.1 Hola mundo

```python
from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def inicio():
    return {"mensaje": "funciona"}
```

```powershell
uvicorn app.main:app --reload
```

Abre `http://localhost:8000`. **Checkpoint:** ves el JSON.

#### 7.2 Un endpoint que lee la base

```python
@app.get("/equipos")
def equipos():
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM equipo")
        return cur.fetchall()
```

#### 7.3 Separar en archivos

Cuando `main.py` pasa de 100 líneas, divide: un archivo por entidad en
`routers/`. No lo hagas antes de tiempo.

#### 7.4 Validar con Pydantic

```python
class ClienteCreate(BaseModel):
    nombre_completo: str = Field(min_length=3)
    email: EmailStr | None = None
```

Aquí ganas tres cosas gratis: rechazo automático de datos basura, mensajes de
error claros y documentación en `/docs`.

**Checkpoint 7:** `http://localhost:8000/docs` lista tus endpoints y puedes
ejecutarlos con **Try it out**.

---

### Fase 8 — El proceso central (la parte que importa)

Aquí es donde un proyecto escolar se distingue. Crear una renta no es un
`INSERT`: es una **operación**.

#### 8.1 Escribir la lista de pasos ANTES del código

1. ¿El cliente existe y está activo?
2. ¿Hay unidades disponibles de cada equipo?
3. ¿Cuál es el precio? (se lee de la base, no del formulario)
4. ¿Cuántos días son? (mínimo 1)
5. Insertar la renta.
6. Insertar cada detalle.
7. Confirmar todo junto.

#### 8.2 La transacción

```python
with db.transaction():
    with db.cursor() as cur:
        # ... todos los INSERT ...
```

- Si el bloque termina bien → `COMMIT`.
- Si cualquier línea lanza excepción → `ROLLBACK` y **nada** se guardó.

Sin `with db.transaction()`, un fallo en el tercer equipo dejaría una renta con
dos renglones: datos corruptos.

#### 8.3 La condición de carrera

Dos empleados rentan a la vez la última bocina:

```
Empleado A: lee disponible = 1
Empleado B: lee disponible = 1
Empleado A: INSERT (queda 0)
Empleado B: INSERT (queda -1)   ← imposible, pero pasó
```

Solución:

```sql
SELECT ... FROM equipo WHERE id_equipo = %s FOR UPDATE
```

`FOR UPDATE` bloquea la fila hasta que la transacción termine. B espera, vuelve
a leer y ve 0. Esto **no se puede probar con un usuario**; se entiende leyendo.

#### 8.4 Nunca confíes en el cliente

```python
# MAL: el usuario puede mandar precio = 1
precio = payload.precio_unitario
```

```python
# BIEN: el precio sale de la base
cur.execute("SELECT precio_renta_diario FROM equipo WHERE id_equipo = %s", ...)
```

**Checkpoint 8:** intentas rentar más de lo que hay y recibes `409` con un
mensaje en español; la base queda igual que antes.

---

### Fase 9 — Reportes

Cada consulta de la Fase 4 se convierte en un endpoint que devuelve
`cur.fetchall()`. No hay lógica nueva: es la misma SQL.

Si el reporte necesita parámetros (`id_cliente`, `limite`), van como parámetros
de la ruta o query string, **nunca** concatenados en el SQL.

---

### Fase 10 — El front

#### 10.1 El orden correcto

1. HTML estático con datos inventados → se ve bien.
2. Reemplazar los datos por `fetch` → ya es dinámico.
3. Formularios.
4. Estados de carga y error.

Si empiezas por el `fetch`, depuras dos cosas a la vez.

#### 10.2 La petición mínima

```js
const respuesta = await fetch("http://localhost:8000/api/equipos");
if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
const equipos = await respuesta.json();
```

#### 10.3 CORS

Si el HTML se abre en `:5500` y la API en `:8000`, son orígenes distintos y el
navegador bloquea. Se resuelve con `CORSMiddleware` en FastAPI. Si sirves el
front desde el mismo servidor (`StaticFiles`), no hay problema.

**Checkpoint 10:** la tabla muestra los equipos reales y la consola del
navegador (`F12`) no tiene errores rojos.

#### 10.4 Login y dos roles (cuando el CRUD ya funciona)

No agregues autenticación al principio: primero haz que el sistema funcione con
un solo usuario implícito. Cuando el negocio ya esté claro, separa los permisos.

**Paso 1 — Modelo.** Un `usuario` no es lo mismo que un `cliente`:

```sql
CREATE TABLE rol (
  id_rol   SERIAL PRIMARY KEY,
  nombre   VARCHAR(20) NOT NULL UNIQUE   -- 'admin', 'cliente'
);

CREATE TABLE usuario (
  id_usuario SERIAL PRIMARY KEY,
  email      VARCHAR(120) NOT NULL UNIQUE,
  password   TEXT NOT NULL,              -- hash, nunca texto plano
  nombre     VARCHAR(80) NOT NULL,
  id_rol     INT NOT NULL REFERENCES rol(id_rol),
  id_cliente INT UNIQUE REFERENCES cliente(id_cliente),  -- NULL para admin
  activo     BOOLEAN NOT NULL DEFAULT TRUE
);
```

`id_cliente` único evita dos cuentas para el mismo cliente y, al ser NULL para
el admin, no obliga a inventar un cliente "sistema".

**Paso 2 — Contraseñas.** Usa `hashlib.pbkdf2_hmac` (viene en Python) con sal
aleatoria e iteraciones altas. Guarda `algoritmo$iteraciones$sal$hash`. Para
comparar, `hmac.compare_digest` (tiempo constante). No inventes tu propio
algoritmo ni guardes la contraseña "cifrada" de forma reversible.

**Paso 3 — Sesión.** Firma una cookie `HttpOnly` con HMAC-SHA256: guarda
`id_usuario.expira.firma`. No uses `localStorage`: cualquier XSS podría leer el
token. La cookie no lleva el rol; el servidor lo consulta en la base en **cada**
petición, así desactivar un usuario surte efecto de inmediato.

**Paso 4 — Dependencias de FastAPI.**

```python
@app.get("/clientes")
def listar(usuario=Depends(usuario_actual)):  # 401 si no hay sesión
    ...

@app.get("/auditoria")
def bitacora(admin=Depends(requiere_admin)):  # 403 si el rol no es admin
    ...
```

**Paso 5 — Pertenencia.** No basta con "solo admin": un cliente debe ver **sus**
rentas. Aplica el filtro en el SQL (`WHERE r.id_cliente = %s`) y responde `404`
—no `403`— cuando pide algo ajeno, para no revelar que existe.

**Paso 6 — Un estado nuevo, no una tabla nueva.** Si el cliente "pide" y el admin
"aprueba", agrega el estado `Solicitada` a `estado_renta`. Su ventaja: no hay
tabla paralela ni dos caminos de código. Su regla: `Solicitada` **no** cuenta
para disponibilidad; el stock se aparta al aprobar, revalidándolo en ese momento.

> **Checkpoint 10.5:** entra como cliente, envía una solicitud; entra como admin,
> apruébala. La disponibilidad del equipo debe bajar recién en la aprobación, y
> un `GET /clientes` con la cookie del cliente debe responder `403`.

El detalle completo de la implementación está en `docs/ROLES.md`.

---

### Fase 11 — Probar

#### 11.1 Prueba manual ordenada

No pruebes "a ver si funciona". Prueba el **camino feliz** y luego los **caminos
tristes**:

| Caso | Resultado esperado |
|---|---|
| Crear renta válida | 201 |
| Rentar más que el stock | 409 |
| Cliente inexistente | 404 |
| Pago mayor al total | 409 |
| Devolver dos veces | 409 |
| Campo faltante | 422 |
| Entrar sin sesión | 401 |
| Cliente llamando `/clientes` | 403 |
| Cliente pidiendo una renta ajena | 404 |
| Aprobar dos veces la misma solicitud | 409 |

#### 11.2 Prueba automatizada

Un script que recorre esos casos y compara resultados vale más que veinte
capturas de pantalla. Es lo que hace `backend/scripts/prueba_api.py`.

---

### Fase 12 — Git

```powershell
git init --initial-branch=main
git add .
git status            # ← LEE lo que vas a subir
git commit -m "Estructura inicial"
```

Antes del primer commit, comprueba que `.gitignore` excluye `.venv/` y `.env`.
Si subes el `.env`, tu contraseña queda en el historial para siempre.

Después: `git remote add origin`, `git push -u origin main`.

---

### Fase 13 — Cuando algo falla

#### 13.1 Leer un traceback

Se lee **de abajo hacia arriba**:

```
File "app/routers/rentas.py", line 87, in crear      ← tu código
    cur.execute("INSERT INTO detaile_renta ...")
psycopg.errors.UndefinedTable: relation "detaile_renta" does not exist
```

- La última línea dice **qué** pasó.
- La línea de arriba dice **dónde**.

Aquí: escribiste mal el nombre de la tabla.

#### 13.2 Tabla de diagnóstico

| Error | Significado | Dónde mirar |
|---|---|---|
| `connection refused` | Nada escuchando en ese puerto | ¿Servicio de PostgreSQL? ¿`uvicorn` corriendo? |
| `password authentication failed` | Credenciales mal | `.env` |
| `does not exist` | Nombre mal escrito o falta crearlo | `\dt` en psql |
| `violates foreign key` | Referencias algo que no existe | Los IDs que mandas |
| `violates check constraint` | Dato absurdo | El `CHECK` de la tabla |
| `ModuleNotFoundError` | Dependencia o entorno | ¿`(.venv)` activo? ¿`pip install -r`? |
| `422 Unprocessable Entity` | Pydantic rechazó el JSON | El cuerpo que mandaste |
| `404` en el navegador | Ruta mal | La ruta exacta del endpoint |
| Página en blanco | Error de JS | `F12` → Console |

#### 13.3 Las tres preguntas

1. **¿Qué esperaba que pasara?**
2. **¿Qué pasó realmente?** (mensaje exacto, no "no funciona")
3. **¿Cuál es la diferencia más pequeña?** Prueba esa.

---

### Apéndice A — Comandos de psql que vas a usar

```powershell
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
& $psql -U postgres -d renta_equipos
```

Dentro de `psql`:

| Comando | Qué hace |
|---|---|
| `\dt` | Lista las tablas |
| `\d equipo` | Estructura de una tabla |
| `\dv` | Lista las vistas |
| `\df` | Lista las funciones |
| `\x` | Cambia a salida vertical (útil con muchas columnas) |
| `\q` | Salir |

---

### Apéndice B — Cómo auditar código que no escribiste (incluida la IA)

Este apéndice responde a la pregunta "¿cómo intervengo cuando el agente se
equivoca?". El ejemplo es real y salió de este proyecto.

#### El caso

La vista `v_equipo_disponible` calculaba las unidades ocupadas así:

```sql
SUM(d.cantidad) FILTER (WHERE er.estado IN ('Reservada','Activa'))
```

Parece correcto: suma lo que está en rentas activas. Pero **ignora la fecha de
devolución**. Si un equipo ya se devolvió y la renta sigue "Activa" (porque otra
línea no ha regresado), esa unidad sigue contando como ocupada.

#### Cómo se detectó

No se detectó leyendo el SQL. Se detectó **ejecutando**:

```
Paso 4: rentar 2 bocinas  → disponible 4 → 2   ✅
Paso 6: devolverlas       → disponible 2 → 2   ❌ debería ser 4
```

Una prueba con una expectativa escrita. Eso es todo.

#### La corrección

```sql
SUM(d.cantidad) FILTER (
    WHERE d.fecha_devolucion IS NULL
      AND er.estado IN ('Reservada','Activa'))
```

#### La lección

Un agente (o un compañero, o tú a las 3 a.m.) produce código **plausible**. Lo
plausible y lo correcto no son lo mismo. Lo único que los distingue es una
verificación que puedas ejecutar y una expectativa que puedas escribir.

Por eso el orden del proyecto es:

```
regla de negocio  →  prueba que la comprueba  →  código
```

y no

```
código  →  "se ve bien"  →  entrega
```

#### Lista de verificación para revisar código generado

1. **¿Entiendo qué hace cada línea?** Si no, no lo apruebes.
2. **¿Los nombres coinciden con la base?** PostgreSQL es sensible a eso.
3. **¿Usa `%s` o concatena strings?** Concatenar = inyección SQL.
4. **¿Lee el precio del cliente?** Debe leerlo de la base.
5. **¿Abre transacción en operaciones múltiples?** Si no, quedan datos a medias.
6. **¿Qué pasa si el dato no existe?** Debe devolver 404, no reventar.
7. **¿Hay un caso de prueba que lo demuestre?** Si no, escríbelo.
8. **¿Puedo romperlo a propósito?** Intenta. Si no se rompe donde debería, algo
   falta.

---
<a id="ruta-aprendizaje"></a>

# Parte 8 — Ruta de aprendizaje

## Ruta de aprendizaje

Qué estudiar, en qué orden y cómo practicarlo, para poder **construir y auditar**
sistemas como este sin depender de una herramienta.

---

### La idea que ordena todo

La IA generativa no eliminó el fundamento técnico: **subió el piso**. Antes un
junior podía aportar escribiendo CRUD repetitivo. Hoy eso lo hace una máquina en
segundos, así que lo que se paga es lo que la máquina no puede hacer sola:

- decidir **qué** construir y por qué,
- detectar cuándo el resultado es plausible pero **incorrecto**,
- diseñar datos que no se corrompan,
- diagnosticar fallas que no aparecen en un tutorial.

Y para hacer esas cuatro cosas hay que saber leer el código. No hay atajo.

> Supervisar sin entender no es supervisar: es aprobar.

---

### Orden de estudio

#### Nivel 0 — La terminal y el sistema operativo

**Por qué:** el 80% de los bloqueos de un principiante son de entorno, no de
lógica (PATH, permisos, puertos, rutas con espacios, variables de entorno).

| Tema | Cómo practicarlo |
|---|---|
| Rutas absolutas vs. relativas | Muévete por el disco solo con `cd`, sin el Explorador |
| PATH y variables de entorno | `$env:PATH`, agregar una carpeta al PATH |
| Procesos y puertos | `Get-Process`, `Get-NetTCPConnection -LocalPort 8000` |
| Permisos y políticas | `Get-ExecutionPolicy`, `Set-ExecutionPolicy -Scope CurrentUser` |
| Redirecciones y tuberías | `comando > archivo.txt`, `comando | Select-String` |

**Meta:** puedes explicar por qué falló `Activate.ps1` y cómo lo comprobaste.

---

#### Nivel 1 — Python de verdad (sin frameworks)

**Por qué:** FastAPI es fácil si Python está firme. Si no, cada error del
framework parece magia.

| Tema | Nivel exigible |
|---|---|
| Tipos y `typing` | `list[dict]`, `str \| None`, por qué ayudan |
| Estructuras | listas, dicts, sets, comprensiones |
| Funciones | argumentos por defecto, `*args`, `**kwargs` |
| Clases | `__init__`, atributos, métodos |
| Excepciones | `try/except/finally`, crear excepciones propias |
| Context managers | `with`, `__enter__`/`__exit__`, `contextlib` |
| Generadores | `yield`, por qué `get_db()` usa `yield` |
| Decoradores | funciones que envuelven funciones; qué hace `@router.get` |
| Módulos y paquetes | `__init__.py`, imports relativos, `if __name__ == "__main__"` |
| Entornos virtuales | `venv`, `pip`, `requirements.txt`, por qué existen |

**Ejercicio de este proyecto:** escribe desde cero un decorador que imprima
cuánto tarda una función en ejecutarse, y aplícalo a los endpoints.

---

#### Nivel 2 — SQL y modelado de datos (el corazón)

**Por qué:** es la habilidad menos reemplazable de todas. Un modelo mal hecho no
lo arregla ningún framework, y los errores de datos son los más caros.

| Tema | Nivel exigible |
|---|---|
| Modelo relacional | entidades, atributos, relaciones, cardinalidades |
| Normalización | 1FN, 2FN, 3FN; cuándo desnormalizar a propósito |
| DDL | `CREATE TABLE`, tipos, `NOT NULL`, `DEFAULT`, `CHECK`, `UNIQUE` |
| Llaves | PK simple y compuesta, FK, `ON DELETE`/`ON UPDATE` |
| N:M | tabla intermedia y **atributos de la relación** |
| DML | `INSERT`, `UPDATE`, `DELETE`, `RETURNING` |
| Consultas | `JOIN` (inner/left), `WHERE`, `ORDER BY`, `LIMIT` |
| Agregación | `GROUP BY`, `HAVING`, `SUM`, `COUNT`, `AVG`, `FILTER` |
| Subconsultas | escalares, `IN`, `EXISTS` |
| Ventanas | `ROW_NUMBER`, `RANK`, `SUM() OVER` (nivel intermedio) |
| Vistas | cuándo calcular en vez de guardar |
| Transacciones | `BEGIN`/`COMMIT`/`ROLLBACK`, atomicidad |
| Concurrencia | niveles de aislamiento, `FOR UPDATE`, condición de carrera |
| Índices | qué aceleran, qué cuestan, cuándo crearlos |
| Triggers y funciones | cuándo la regla debe vivir en la base |
| `EXPLAIN ANALYZE` | leer un plan de ejecución básico |

**Cómo practicar:** toma este esquema y respóndete con SQL, sin mirar:

1. ¿Qué cliente ha rentado más veces?
2. ¿Qué equipo nunca se ha rentado?
3. ¿Cuál es el ingreso promedio por renta de cada mes?
4. ¿Qué rentas tienen pagos incompletos?
5. ¿Qué categoría tiene más unidades fuera ahora mismo?

Después compara tu consulta con la del proyecto. Si difieren, entiende por qué.

---

#### Nivel 3 — HTTP y la web

**Por qué:** sin esto, el backend es una caja negra y el front un misterio.

| Tema | Nivel exigible |
|---|---|
| Modelo petición/respuesta | método, ruta, cabeceras, cuerpo |
| Métodos | `GET` vs `POST` vs `PUT` vs `PATCH` vs `DELETE` (idempotencia) |
| Códigos de estado | 200, 201, 400, 401, 403, 404, 409, 422, 500 |
| JSON | estructura, tipos, anidamiento |
| CORS | qué es un origen, por qué el navegador bloquea |
| Cookies y sesiones | cómo se mantiene un login |
| Autenticación | tokens, JWT, `Authorization: Bearer` |
| HTTPS | qué protege y qué no |

**Cómo practicarlo:** abre `F12` → pestaña *Network* en cualquier sitio y lee
las peticiones. Adivina el método y el código antes de verlos.

---

#### Nivel 4 — Backend con Python

| Tema | Nivel exigible |
|---|---|
| FastAPI | rutas, parámetros de ruta/query/body, routers |
| Pydantic | validación, tipos, validadores propios |
| Inyección de dependencias | `Depends`, por qué facilita las pruebas |
| psycopg | cursores, `row_factory`, parámetros `%s` |
| Pool de conexiones | por qué no abrir una por petición |
| Manejo de errores | excepciones HTTP, handlers, mensajes al usuario |
| Logs | qué registrar y qué nunca (contraseñas, datos personales) |
| Configuración | `.env`, 12-factor, nunca hardcodear secretos |
| Migraciones | qué son; herramienta típica: Alembic |

---

#### Nivel 5 — Frontend

| Tema | Nivel exigible |
|---|---|
| HTML semántico | formularios, labels, tablas, accesibilidad básica |
| CSS | box model, flexbox, grid, media queries |
| Bootstrap | grid, componentes, utilidades; no pelear con él |
| JavaScript | variables, funciones, arrays, objetos, módulos |
| DOM | `querySelector`, `addEventListener`, crear elementos |
| `fetch` y `async/await` | manejo de errores, estados de carga |
| Validación en cliente | sabiendo que **no** sustituye la del servidor |
| DevTools | Elements, Console, Network, Application |

---

#### Nivel 6 — Ingeniería de software

**Por qué:** separa a quien "hace que funcione" de quien puede mantenerlo.

| Tema | Nivel exigible |
|---|---|
| Git | `add`, `commit`, `push`, `pull`, ramas, `merge`, resolver conflictos |
| Ramas y PR | `feature/x`, revisión antes de integrar |
| Testing | pruebas unitarias y de integración, `pytest`, *fixtures* |
| Debugging | breakpoints, leer tracebacks, reproducir con el mínimo caso |
| Refactor | cambiar estructura sin cambiar comportamiento |
| Lectura de código ajeno | entrar por `main`, seguir el flujo |
| Documentación | README, docstrings, decisiones (ADR) |

**Ejercicio:** escribe una prueba con `pytest` que verifique que rentar más del
stock devuelve 409. Es el tipo de prueba que atrapó el bug de la vista.

---

#### Nivel 7 — Operación

| Tema | Nivel exigible |
|---|---|
| Docker | imagen, contenedor, `docker compose` para Postgres |
| Puertos y redes | mapeo, `localhost` dentro vs. fuera del contenedor |
| Respaldo y restauración | `pg_dump`, `pg_restore` |
| Despliegue | variables de entorno en el servidor, proceso persistente |
| Monitoreo | logs, salud del servicio |

---

#### Nivel 8 — Seguridad (transversal, no opcional)

| Tema | Nivel exigible |
|---|---|
| Inyección SQL | por qué `%s` y nunca concatenar |
| Hash de contraseñas | `bcrypt`/`argon2`, nunca texto plano ni MD5 |
| Gestión de secretos | `.env`, no en Git, rotar si se filtra |
| Validación en servidor | el cliente es hostil por definición |
| Principio de mínimo privilegio | usuario de BD sin permisos de superusuario |
| OWASP Top 10 | al menos entender los cinco primeros |

---

### Cómo trabajar con agentes sin volverte dependiente

Un protocolo concreto, aplicable a cualquier asistente:

1. **Pide el plan antes del código.** "Explícame los pasos y las decisiones."
   Si el plan no te convence, no sigas.
2. **Divide en piezas verificables.** Nunca "hazme el sistema": "hazme el
   endpoint que devuelve equipos disponibles".
3. **Exige el criterio de prueba.** "¿Cómo compruebo que esto está bien?"
4. **Lee el diff completo.** Si no entiendes una línea, pregúntala.
5. **Rompe el código a propósito.** Manda datos inválidos, IDs inexistentes,
   cantidades negativas.
6. **Verifica contra la base, no contra la respuesta.** Que la API diga "ok" no
   significa que la fila quedó bien.
7. **Escribe la prueba tú.** Si solo la escribe el agente, estás validando al
   agente con el agente.

#### Señales de que estás usando la IA mal

- No puedes explicar el código que entregas.
- Copias y pegas sin leer y luego "a ver si corre".
- Cuando falla, tu primer movimiento es pedir otra versión en vez de leer el
  error.
- No sabrías escribirlo de nuevo sin la herramienta.

#### Señales de que la estás usando bien

- La usas para **acelerar** cosas que ya sabes hacer.
- La usas para **aprender**: "explícame por qué esto es así".
- Detectas sus errores antes de ejecutar.
- Puedes escribir la versión simple a mano.

---

### Plan sugerido a partir de hoy

| Semanas | Objetivo |
|---|---|
| 1–2 | Rehacer este proyecto desde cero con `MANUAL_DESDE_CERO.md` |
| 3–4 | SQL a fondo: las 5 consultas de práctica + `EXPLAIN` |
| 5–6 | Tests con `pytest` sobre este mismo proyecto |
| 7 | Dockerizar Postgres + la API |
| 8 | Autenticación: login con JWT y hash de contraseñas |
| 9–10 | Un proyecto propio pequeño, sin asistente, de principio a fin |

La meta no es memorizar sintaxis: es poder decir **"esto está mal y aquí está la
prueba"**. Eso es lo que se paga.

---
<a id="evidencia"></a>

# Parte 9 — Evidencia técnica (modelo y álgebra)

## Evidencia técnica

### 1. Modelo relacional

```
CATEGORIA (id_categoria PK, nombre_categoria UK, descripcion)

CLIENTE (id_cliente PK, nombre_completo, telefono, email UK,
         estatus_activo, fecha_alta)

ESTADO_RENTA (id_estado PK, estado UK)

EQUIPO (id_equipo PK, id_categoria FK -> CATEGORIA, nombre, marca,
        precio_renta_diario, stock, UK(nombre, marca))

RENTA (id_renta PK, id_cliente FK -> CLIENTE, id_estado FK -> ESTADO_RENTA,
       fecha_registro, fecha_inicio, fecha_fin_estimada, monto_total)

DETALLE_RENTA (id_detalle PK, id_renta FK -> RENTA, id_equipo FK -> EQUIPO,
               cantidad, fecha_devolucion, precio_unitario, subtotal,
               UK(id_renta, id_equipo))

PAGO (id_pago PK, id_renta FK -> RENTA, monto_pagado, fecha_pago, metodo_pago)
```

**PK** = llave primaria · **FK** = llave foránea · **UK** = valor único

#### Cardinalidades

| Relación | Cardinalidad | Implementación |
|---|---|---|
| CATEGORIA → EQUIPO | 1 : N | `equipo.id_categoria` |
| CLIENTE → RENTA | 1 : N | `renta.id_cliente` |
| ESTADO_RENTA → RENTA | 1 : N | `renta.id_estado` |
| **RENTA ↔ EQUIPO** | **N : M** | **tabla intermedia `DETALLE_RENTA`** |
| RENTA → PAGO | 1 : N | `pago.id_renta` |

La N:M se resuelve con `DETALLE_RENTA`, que además guarda los atributos
propios de la relación: **cantidad**, **fecha de devolución**, **precio
unitario** y **subtotal**.

---

### 2. Diagrama entidad-relación

Código Mermaid (se renderiza en <https://mermaid.live>, GitHub, Notion o VS Code
con la extensión *Markdown Preview Mermaid*; desde mermaid.live se exporta PNG
para el documento):

```mermaid
erDiagram
    CATEGORIA ||--o{ EQUIPO : clasifica
    CLIENTE   ||--o{ RENTA  : solicita
    ESTADO_RENTA ||--o{ RENTA : define
    RENTA     ||--|{ DETALLE_RENTA : contiene
    EQUIPO    ||--o{ DETALLE_RENTA : "es rentado en"
    RENTA     ||--o{ PAGO   : liquida

    CATEGORIA {
        int     id_categoria PK
        varchar nombre_categoria UK
        text    descripcion
    }
    CLIENTE {
        int     id_cliente PK
        varchar nombre_completo
        varchar telefono
        varchar email UK
        boolean estatus_activo
        date    fecha_alta
    }
    ESTADO_RENTA {
        int     id_estado PK
        varchar estado UK
    }
    EQUIPO {
        int     id_equipo PK
        int     id_categoria FK
        varchar nombre
        varchar marca
        numeric precio_renta_diario
        int     stock
    }
    RENTA {
        int       id_renta PK
        int       id_cliente FK
        int       id_estado FK
        timestamp fecha_registro
        date      fecha_inicio
        date      fecha_fin_estimada
        numeric   monto_total
    }
    DETALLE_RENTA {
        int     id_detalle PK
        int     id_renta FK
        int     id_equipo FK
        int     cantidad
        date    fecha_devolucion
        numeric precio_unitario
        numeric subtotal
    }
    PAGO {
        int       id_pago PK
        int       id_renta FK
        numeric   monto_pagado
        timestamp fecha_pago
        varchar   metodo_pago
    }
```

---

### 3. Restricciones implementadas

| Restricción | Dónde | Qué impide |
|---|---|---|
| `CHECK (precio_renta_diario >= 0)` | EQUIPO | Precios negativos |
| `CHECK (stock >= 0)` | EQUIPO | Stock negativo |
| `CHECK (fecha_fin_estimada >= fecha_inicio)` | RENTA | Entregar antes de iniciar |
| `CHECK (cantidad > 0)` | DETALLE_RENTA | Renglones en cero |
| `UNIQUE (id_renta, id_equipo)` | DETALLE_RENTA | Duplicar el mismo equipo en una renta |
| `CHECK (metodo_pago IN (...))` | PAGO | Métodos de pago inválidos |
| `UNIQUE` en email y nombres | CLIENTE, CATEGORIA | Duplicados |
| Trigger `trg_detalle_monto` | DETALLE_RENTA | Que `monto_total` no cuadre |
| Trigger `trg_detalle_fecha_devolucion` | DETALLE_RENTA | Devolver antes de rentar |
| Vista `v_equipo_disponible` | — | Que el stock se desincronice |

---

### 4. Tres expresiones de álgebra relacional

Notación: **σ** selección · **π** proyección · **⋈** reunión natural ·
**γ** agrupación · **⟕** reunión externa izquierda · **ρ** renombrado.

#### 4.1 Equipos pendientes de devolución (Consulta 1)

> Cliente, teléfono, equipo y cantidad de todo lo que aún no se devuelve.

```
π_(nombre_completo, telefono, nombre, cantidad, fecha_inicio) (
    σ_(fecha_devolucion IS NULL) (
        DETALLE_RENTA ⋈ RENTA ⋈ CLIENTE ⋈ EQUIPO
    )
)
```

#### 4.2 Ingresos por categoría (Consulta 3)

> Total facturado y piezas rentadas, agrupados por categoría.

```
γ_(nombre_categoria ; SUM(subtotal) → ingresos, SUM(cantidad) → articulos) (
    CATEGORIA ⋈ EQUIPO ⋈ DETALLE_RENTA
)
```

#### 4.3 Rentas por estado (Consulta 6)

> Cuántas rentas hay en cada estado, incluyendo los estados sin rentas.

```
γ_(estado ; COUNT(id_renta) → total_rentas) (
    ESTADO_RENTA ⟕ RENTA
)
```

#### 4.4 Extra — historial de un cliente (Consulta 2)

> Renglones de las rentas finalizadas del cliente con `id_cliente = 3`.

```
π_(id_renta, nombre, cantidad, subtotal, fecha_devolucion) (
    σ_(id_cliente = 3 ∧ estado = 'Finalizada') (
        RENTA ⋈ DETALLE_RENTA ⋈ EQUIPO ⋈ ESTADO_RENTA
    )
)
```

---

### 5. Correspondencia consulta SQL ↔ álgebra relacional

| # | Consulta SQL | Operadores usados |
|---|---|---|
| 1 | Pendientes de devolución | σ, π, ⋈ |
| 2 | Historial de un cliente | σ, π, ⋈ |
| 3 | Ingresos por categoría | γ, ⋈ |
| 4 | Clientes activos | σ, π |
| 5 | Inventario bajo | σ, π |
| 6 | Rentas por estado | γ, ⟕ |
| 7 | Detalle de una renta | σ, π, ⋈ |
| 8 | Total cobrado | γ |

---
<a id="github"></a>

# Parte 10 — Guía de GitHub y trabajo en equipo

## Cómo compartir el proyecto con el equipo (GitHub)

### Antes de empezar: la carpeta de OneDrive

El proyecto vive en `C:\Users\casta\OneDrive\Documents\base_datos`. Funciona,
pero OneDrive trae tres problemas:

1. El entorno virtual `.venv` tiene **miles de archivos**; OneDrive los sube
   todos y la carpeta se vuelve lentísima.
2. OneDrive bloquea archivos mientras los sincroniza y Git puede fallar.
3. Si dos personas modifican a la vez, OneDrive crea copias
   `archivo (1).py` en lugar de conflictos claros de Git.

**Es opcional, pero recomendado** moverlo fuera de OneDrive. Si lo haces,
vuelve a crear el entorno (las rutas internas del venv son absolutas):

```powershell
# 1. Mueve la carpeta
Move-Item "C:\Users\casta\OneDrive\Documents\base_datos" "C:\dev\base_datos"

# 2. Recrea el entorno
cd C:\dev\base_datos\backend
Remove-Item .venv -Recurse -Force
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts\crear_bd.py
```

---

### 1. Qué se sube y qué NO

El archivo `.gitignore` ya está configurado. **Nunca** se sube:

| Archivo | Por qué |
|---|---|
| `backend/.env` | Contiene la contraseña de PostgreSQL |
| `backend/.venv/` | Miles de archivos, cada quien lo crea |
| `__pycache__/` | Archivos temporales de Python |

Sí se sube `backend/.env.example`, que es la plantilla sin contraseña.

> Si algún día subes el `.env` por error, cambia la contraseña de la base. El
> historial de Git conserva todo lo que se subió.

---

### 2. Crear el repositorio

#### 2.1 En la web de GitHub

1. Entra a <https://github.com> → **New repository**.
2. Nombre: `renta-equipos`.
3. Visibilidad: **Private** (privado) mientras sea trabajo escolar.
4. **No** marques "Add a README" ni ".gitignore" (ya los tenemos).
5. **Create repository**.

#### 2.2 En tu computadora

```powershell
cd C:\Users\casta\OneDrive\Documents\base_datos

git remote add origin https://github.com/TU-USUARIO/base_datos.git
git branch -M main
git push -u origin main
```

> El repositorio local y el primer commit **ya están creados**. Solo faltan
> estas tres líneas: `git init`, `git add` y `git commit` ya se ejecutaron.

Al hacer `push`, Git abre una ventana del navegador para iniciar sesión en
GitHub (Git Credential Manager). Inicia sesión y autoriza; no necesitas escribir
contraseña en la terminal.

Si en lugar del navegador te pide usuario y contraseña, la contraseña normal
**no funciona**: hay que usar un *Personal Access Token*:

1. GitHub → tu foto → **Settings** → **Developer settings**
2. **Personal access tokens** → **Tokens (classic)** → **Generate new token**
3. Marca el permiso `repo`, genera y **copia el token** (solo se muestra una vez).
4. En la terminal, cuando pida contraseña, pega el token.

Alternativa más cómoda: instalar **GitHub Desktop** y arrastrar la carpeta.

---

### 3. Invitar a tus compañeros

En el repositorio: **Settings** → **Collaborators** → **Add people** →
escribe su usuario de GitHub → **Add collaborator**.

Cada uno acepta la invitación por correo o en
`https://github.com/notifications`.

---

### 4. Flujo de trabajo diario

```powershell
# ANTES de trabajar: traer cambios de los demás
git pull

# ...trabajan...

git add .
git commit -m "Agrega pantalla de clientes"
git push
```

**Reglas para no pisarse:**

- Trabajen en archivos distintos cuando puedan (tú `backend/`, ella
  `frontend/`).
- Hagan `git pull` **antes** de empezar y antes de hacer `push`.
- Si Git avisa de un conflicto, no borren archivos: pidan ayuda y revisen el
  archivo marcado con `<<<<<<<`.
- Commits pequeños y con mensaje claro.

---

### 5. Qué hace cada compañero al clonar

```powershell
git clone https://github.com/TU-USUARIO/renta-equipos.git
cd renta-equipos\backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Crear su .env a partir de la plantilla
Copy-Item .env.example .env
# ...y editar .env con SU contraseña de PostgreSQL

python scripts\crear_bd.py
uvicorn app.main:app --reload
```

Cada quien tiene **su propia base de datos local**. Eso es normal y deseable:
así nadie rompe los datos de los demás.

---

### 6. No se sube la base de datos... ¿y entonces?

La base se **reconstruye** con los scripts:

```
sql/01_esquema.sql  +  sql/02_datos.sql
```

Por eso es importante que esos archivos estén siempre actualizados: son la
"receta" de la base. Si alguien cambia una tabla, debe modificar
`01_esquema.sql` y avisar al equipo para que vuelva a ejecutarlo.

---

### 7. Alternativa sin GitHub

Si el profesor no permite repositorios, comparte un `.zip` **sin** `backend/.venv`:

```powershell
# Desde la carpeta padre
Compress-Archive -Path "renta-equipos" -DestinationPath "renta-equipos.zip" -Force
```

Pero se pierde el historial de cambios y es fácil que alguien sobrescriba el
trabajo del otro. GitHub es claramente mejor.

---

---

> **Este archivo se genera automáticamente.** No lo edites a mano: cambia el
> documento original y vuelve a ejecutar, desde la raíz:
>
> ```powershell
> python scripts/generar_documentacion.py
> ```
