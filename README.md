# Sistema de Renta de Equipos Audiovisuales

Proyecto escolar: base de datos relacional en **PostgreSQL 18** + **API REST en Python** + sitio web en **HTML/CSS/Bootstrap/JS**.

```
Proyecto predeterminado/
├── backend/          API en Python (FastAPI + psycopg)
├── frontend/         Sitio web (Bootstrap + JS)
├── sql/              Esquema, datos, consultas y prueba del proceso
└── docs/             Contrato de la API y documentación
```

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
2. `sql/02_datos.sql`    → datos de prueba

Verificación rápida (debe devolver 4 filas con su disponibilidad):

```sql
SELECT * FROM v_equipo_disponible ORDER BY id_equipo;
```

> `sql/03_consultas.sql` son las 8 consultas de la evidencia técnica.
> `sql/04_verificacion.sql` simula el proceso central y termina en `ROLLBACK`, no ensucia la base.

---

## 2. Configurar el backend

Edita `backend/.env` y pon **tu** contraseña de PostgreSQL:

```
DATABASE_URL=postgresql://postgres:TU_CONTRASENA@localhost:5432/renta_equipos
```

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
| http://localhost:8000/ | El sitio (sirve `frontend/`) |
| http://localhost:8000/docs | Documentación interactiva de la API (Swagger) |
| http://localhost:8000/api/salud | Prueba de conexión a PostgreSQL |

Si la página de inicio muestra "Conectado a renta_equipos — PostgreSQL OK", todo está bien.

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
- `backend/app/schemas.py` — validación de datos de entrada
- `backend/app/routers/` — un archivo por entidad

### Frontend
- `frontend/index.html` — pantalla de ejemplo (ya consume la API)
- `frontend/assets/js/api.js` — **cliente HTTP listo para usar** (`Api.clientes.listar()`, etc.)
- `frontend/assets/css/estilos.css` — estilos base

El contrato completo de endpoints está en **`docs/API.md`**.

---

## 5. Proceso central: crear una renta

`POST /api/rentas` hace todo dentro de **una sola transacción**:

1. Valida que el cliente exista y esté activo.
2. Por cada equipo: bloquea la fila (`FOR UPDATE`), lee el precio **de la base** (nunca del navegador) y verifica disponibilidad real.
3. Calcula `subtotal = cantidad × precio_diario × días`.
4. Inserta la renta y sus detalles.
5. Un trigger recalcula `monto_total`.

Si algo falla (stock insuficiente, cliente inactivo, fecha inválida), **no se guarda nada**.

La disponibilidad no se guarda en una columna: se calcula con la vista `v_equipo_disponible`, así nunca se desincroniza.

---

## 6. Documentación

| Documento | Contenido |
|---|---|
| `docs/MANUAL_USUARIO.md` | Manual de usuario del sitio, con capturas y solución de problemas |
| `docs/COMO_FUNCIONA.md` | Explicación técnica: cómo funciona cada parte y por qué |
| `docs/API.md` | Contrato de endpoints para el equipo de frontend |
| `docs/EVIDENCIA.md` | Modelo relacional, diagrama ER, álgebra relacional |
| `docs/GUIA_GITHUB.md` | Cómo subir el proyecto y trabajar en equipo |

---

## 7. Problemas comunes

| Síntoma | Causa / solución |
|---|---|
| *"la ejecución de scripts está deshabilitada"* | Ejecuta `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| La ventana se cierra al hacer doble clic en `Activate.ps1` | Ese archivo no se ejecuta con doble clic; abre PowerShell en la carpeta y escribe `.\\.venv\\Scripts\\Activate.ps1` |
| `connection refused` | PostgreSQL no está corriendo |
| `password authentication failed` | Contraseña mal en `backend/.env` |
| `database "renta_equipos" does not exist` | Falta crear la base en pgAdmin |
| `No module named app` | Ejecutaste `uvicorn` desde la carpeta equivocada; debe ser desde `backend/` |
| El front dice "No se pudo conectar" | El backend no está levantado |
| `column "x" does not exist` | Los nombres en PostgreSQL son en minúsculas |
