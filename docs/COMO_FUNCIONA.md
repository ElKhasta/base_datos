# Cómo funciona el proyecto (guía de estudio)

Documento para entender **qué se construyó y por qué**. Está pensado para
alguien de 5.º semestre que ya programa en Python pero no ha hecho una
aplicación web completa con base de datos.

---

## 1. Panorama general: tres capas

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

## 2. El viaje de una petición

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

## 3. El backend explicado

### 3.1 ¿Qué es el entorno virtual (`.venv`)?

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

### 3.2 Las librerías

| Librería | Para qué |
|---|---|
| **FastAPI** | Crear la API: rutas, validación, documentación automática |
| **Uvicorn** | El servidor que mantiene la aplicación escuchando en un puerto |
| **psycopg** | El "traductor" entre Python y PostgreSQL |
| **psycopg_pool** | Reutiliza conexiones en vez de abrir una por petición |
| **Pydantic** | Valida los datos que llegan del navegador |
| **python-dotenv** | Lee el archivo `.env` con la contraseña |

### 3.3 Rutas y decoradores

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

### 3.4 Inyección de dependencias: `Depends(get_db)`

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

### 3.5 `with`: context managers

```python
with db.cursor() as cur:
    cur.execute("SELECT ...")
```

`with` garantiza que el cursor se cierre aunque ocurra una excepción. Es el
equivalente a `try/finally`, pero más limpio.

### 3.6 `with db.transaction():`

Marca un bloque atómico. Si el bloque termina bien → `COMMIT`. Si lanza
cualquier excepción → `ROLLBACK`. Por eso `crear()` puede insertar una renta y
luego fallar en el tercer equipo sin dejar basura.

### 3.7 Pydantic: validar antes de tocar la base

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

### 3.8 Manejo de errores

En `main.py` hay *exception handlers* que atrapan los errores de PostgreSQL y
los traducen:

```python
@app.exception_handler(pg_errors.ForeignKeyViolation)
```

Así el front no recibe `violates foreign key constraint "fk_detalle_equipo"`
sino `"No se puede completar la operación: el registro está siendo usado..."`.

Es buena práctica: los mensajes técnicos van al log, los entendibles al usuario.

---

## 4. La base de datos explicada

### 4.1 Llaves

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

### 4.2 La relación N:M

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

### 4.3 Los JOIN

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

### 4.4 `GROUP BY` y funciones de agregación

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

### 4.5 Vistas

```sql
CREATE VIEW v_equipo_disponible AS SELECT ...;
```

Una vista es una consulta guardada con nombre de tabla. Aquí resuelve un
problema de diseño: **el stock disponible no se guarda, se calcula**.

Si guardáramos una columna `disponible` y la descontáramos a mano, tarde o
temprano quedaría mal (una devolución no registrada, una renta cancelada, un
error). Calculándola siempre a partir de los datos reales, es imposible que se
desincronice.

### 4.6 Triggers

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

### 4.7 Transacciones y `FOR UPDATE`

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

### 4.8 Consultas parametrizadas (`%s`)

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

## 5. Cómo se conecta el front

### 5.1 `fetch`

```js
const respuesta = await fetch("http://localhost:8000/api/equipos");
const equipos = await respuesta.json();
```

`fetch` es la función del navegador para hacer peticiones HTTP. `await` espera
la respuesta sin bloquear la página.

El archivo `frontend/assets/js/api.js` envuelve todo eso: revisa el código HTTP,
parsea el JSON, lanza un `Error` con el mensaje del backend y ofrece atajos como
`Api.rentas.crear(datos)`.

### 5.2 JSON

El formato de intercambio. Un objeto de Python se convierte en JSON y viceversa:

```python
{"id_equipo": 1, "nombre": "Proyector 4K"}   # Python / JSON
```

### 5.3 CORS

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

## 6. Por dónde leer el código (orden recomendado)

1. `sql/01_esquema.sql` — entiende las tablas antes que nada.
2. `sql/02_datos.sql` — mira datos concretos.
3. `backend/app/schemas.py` — qué datos acepta el sistema.
4. `backend/app/routers/clientes.py` — el CRUD más simple.
5. `backend/app/routers/rentas.py` — el proceso central, con transacción.
6. `backend/app/main.py` — cómo se ensambla todo.
7. `backend/app/routers/reportes.py` — las consultas de la rúbrica.
8. `frontend/assets/js/api.js` y `frontend/index.html` — el consumo desde el navegador.

### Ejercicios para practicar

1. Agrega un campo `direccion` a `cliente` (ALTER TABLE + schema + endpoint).
2. Crea un endpoint que devuelva el total rentado por mes
   (`DATE_TRUNC('month', fecha_inicio)` + `GROUP BY`).
3. Haz que una renta no pueda cancelarse si ya tiene pagos registrados.
4. Agrega un reporte de equipos que nunca se han rentado (`LEFT JOIN` +
   `IS NULL`).
5. Rompe algo a propósito: intenta rentar 999 proyectores desde Swagger y lee
   el mensaje de error.

---

## 7. Errores conceptuales frecuentes

| Error | Por qué está mal |
|---|---|
| Conectar el front directo a PostgreSQL | Expone la contraseña y salta las reglas de negocio |
| Guardar el precio que manda el navegador | El usuario puede modificarlo; el precio se lee de la BD |
| Usar `float` para dinero | Los decimales binarios pierden centavos; se usa `NUMERIC` |
| Concatenar SQL | Inyección SQL |
| Guardar el stock "disponible" como columna | Se desincroniza; mejor una vista calculada |
| `DELETE` en clientes con historial | Se pierde la trazabilidad; se usa baja lógica |
| Validar solo en el front | Cualquiera puede saltarse el front con `curl` |
