# Guía de VS Code (Windows + PowerShell)

Esta guía es para abrir el proyecto, activar el entorno virtual, levantar la API,
correr las pruebas y depurar. Está escrita para que cualquier compañero la siga
**en orden**, sin suponer que ya configuró Python.

> **Resumen para impacientes:** abre la terminal en `backend`, ejecuta
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force`, luego
> `.\.venv\Scripts\Activate.ps1`, luego `uvicorn app.main:app --reload`, y abre
> `http://localhost:8000`. El resto de esta guía explica por qué.

---

## 0. Requisitos previos

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

## 1. Abrir el proyecto

1. VS Code → **File → Open Folder…** → selecciona la carpeta `base_datos`
   (la que contiene `backend`, `frontend`, `sql` y `docs`).
2. Si aparece *"Do you trust the authors of the files in this folder?"*, elige
   **Yes**. Sin confiar en el workspace, la extensión de Python no arranca.
3. Abre una terminal integrada con **Ctrl + `** (Ctrl + tilde) o
   **Terminal → New Terminal**.

Verás algo como `PS C:\Users\...\base_datos>`. Todavía no actives nada: primero
hay que estar en la carpeta correcta.

---

## 2. Instalar las extensiones recomendadas

Abre **Extensions (Ctrl+Shift+X)** e instala:

- **Python** (`ms-python.python`)
- **Pylance** (`ms-python.vscode-pylance`)
- **Python Debugger** (`ms-python.debugpy`)

El repositorio trae un `.vscode/extensions.json`, así que VS Code te sugerirá
instalarlas automáticamente al abrir el proyecto.

---

## 3. Crear el entorno virtual (solo la primera vez)

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

## 4. El paso que más falla: `Activate.ps1`

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

### ¿Por qué `-Scope Process` y no `-Scope CurrentUser`?

| Opción | Qué hace | Recomendación |
|---|---|---|
| `-Scope Process` | Aplica solo a esa terminal; se pierde al cerrarla | **Úsala**: no necesitas administrador ni dejas el equipo más permisivo |
| `-Scope CurrentUser -ExecutionPolicy RemoteSigned` | Permite scripts locales de forma permanente para tu usuario | Opcional si te cansas de escribirla; pide confirmación al dueño del equipo |
| `Set-ExecutionPolicy Unrestricted` | Permite todo | **No** |

Cada terminal nueva es un proceso nuevo: vuelve a escribir las dos líneas. Por
eso conviene dejar **una sola terminal de VS Code abierta** mientras trabajas.

### Cómo saber que sí se activó

El prompt debe mostrar `(.venv)` al inicio. Comprueba además:

```powershell
$env:VIRTUAL_ENV
python -m pip --version
```

Debe aparecer una ruta que termine en `backend\.venv\Scripts\python.exe`. Si
aparece `C:\Users\...\AppData\Local\Programs\Python\...`, el intérprete está mal
elegido (ver apartado siguiente).

### Seleccionar el intérprete en VS Code

**Ctrl+Shift+P → `Python: Select Interpreter` →**
`.\backend\.venv\Scripts\python.exe`.

El archivo `.vscode/settings.json` del repositorio ya lo deja configurado, pero
si VS Code no lo detecta, hazlo a mano con ese comando.

---

## 5. Instalar dependencias

Con el venv activo y estando en `backend`:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Debe instalar FastAPI, Uvicorn, psycopg, python-dotenv y Pydantic (versiones
fijadas en `requirements.txt`).

---

## 6. La base de datos y el archivo `.env`

### Si tu compañero parte de cero

```powershell
python scripts/crear_bd.py
```

Pide la contraseña de PostgreSQL, crea la base `renta_equipos`, carga
`sql/01_esquema.sql` + `sql/02_datos.sql` y **escribe `backend/.env`** con la
cadena de conexión y una `SECRET_KEY` aleatoria.

> ⚠️ `01_esquema.sql` empieza con `DROP`. No lo ejecutes sobre una base que ya
> tenga datos. Si la base ya existía de una versión anterior, aplica solo
> `sql/05_roles.sql` (es idempotente y conserva clientes y rentas).

### Si quieres configurar `.env` a mano

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

## 7. Levantar la API

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

### Forma rápida en VS Code

- **Ctrl+Shift+B** ejecuta la tarea **Iniciar API (uvicorn --reload)**.
- **F5** inicia la misma API con depurador (archivo `.vscode/launch.json`).

No hagas las dos cosas a la vez: el puerto 8000 solo admite un proceso.

---

## 8. Abrir el sitio

Entra a **http://localhost:8000**:

1. Te lleva a `login.html`.
2. Administrador → `admin@rentavisual.mx` / `Admin123!` → panel general.
3. Cliente → `luis@rentavisual.mx` / `Cliente123!` → portal del cliente.

El backend sirve la carpeta `frontend`, así que **no hace falta Live Server**.
Si prefieres Live Server en `:5500`, el CORS ya lo permite; aun así, la forma
recomendada es servir todo desde `:8000` para no mezclar orígenes.

---

## 9. Pruebas personalizadas

### 9.1 Prueba de humo incluida

Con la API arriba, en otra terminal (también con el venv activo):

```powershell
python scripts/prueba_api.py
```

Recorre: conexión, login de ambos roles, permisos (403/404), solicitud del
cliente **sin** apartar stock, aprobación del admin **con** revalidación de
stock, bitácora, reportes y limpieza. Crea una renta temporal y la borra al
final; no toca las rentas reales.

En VS Code: **Ctrl+Shift+P → Tasks: Run Test Task → Prueba de humo de la API**.

### 9.2 Probar desde Swagger (sin escribir código)

1. Abre http://localhost:8000/docs.
2. Ejecuta `POST /auth/login` con las credenciales del admin.
3. La cookie queda guardada en el navegador: ya puedes ejecutar
   `GET /auth/yo`, `GET /clientes`, `GET /auditoria`, etc.
4. Para probar el otro rol, cierra sesión y haz login con el cliente.
   Un `GET /clientes` con la cookie del cliente debe responder `403`.

### 9.3 Probar desde PowerShell

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

### 9.4 Escribir tu propia prueba

Usa `urllib` + `http.cookiejar` (lo que hace `prueba_api.py`) o JavaScript desde
la consola del navegador:

```js
const r = await fetch("/api/reportes/resumen", { credentials: "include" });
console.log(r.status, await r.json());
```

`credentials: "include"` es obligatorio para enviar la cookie.

---

## 10. Tareas y depuración ya configuradas

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

## 11. Problemas comunes

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

## 12. Checklist para un compañero (copiar y pegar)

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
