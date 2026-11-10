# Manual para construirlo desde cero

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

## Fase 0 — Comprobar las herramientas

### 0.1 Verificar que todo está instalado

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

### 0.2 Entender PowerShell (5 minutos que ahorran horas)

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

## Fase 1 — Diseñar antes de escribir SQL

Esta es la fase que más se salta la gente y la que más caro sale. **No abras
pgAdmin todavía.** Lápiz y papel.

### 1.1 Sacar las entidades (los sustantivos)

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

### 1.2 Encontrar la relación N:M

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

### 1.3 Elegir los tipos de dato

| Dato | Tipo | Por qué NO otro |
|---|---|---|
| Dinero | `NUMERIC(10,2)` | `FLOAT` pierde centavos (0.1 + 0.2 ≠ 0.3) |
| Fechas sin hora | `DATE` | `TIMESTAMP` sobra |
| Fecha de registro | `TIMESTAMPTZ` | Guarda zona horaria |
| Texto corto | `VARCHAR(n)` | `TEXT` no limita |
| Booleano | `BOOLEAN` | Mejor que `'S'/'N'` |
| Identificador | `INTEGER GENERATED ALWAYS AS IDENTITY` | Es el estándar actual; `SERIAL` es de la vieja escuela |

### 1.4 Detectar las restricciones

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

## Fase 2 — Crear la base y el esquema

### 2.1 Crear la base

En pgAdmin: clic derecho en *Databases* → **Create → Database** → `renta_equipos`.

O por consola:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE renta_equipos;"
```

### 2.2 Orden de creación

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

### 2.3 Escribir una tabla completa, con todo justificado

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

### 2.4 Nombrar las restricciones

Nombrarlas (`CONSTRAINT fk_equipo_categoria`) no es decoración: cuando
PostgreSQL lanza un error, lo identifica por ese nombre, y el backend lo usa
para responder un mensaje entendible. Sin nombre, el motor inventa uno como
`equipo_id_categoria_fkey` y el mensaje queda genérico.

**Checkpoint 2:** en pgAdmin, `SELECT * FROM equipo;` funciona; `\d equipo` (o
la pestaña *Constraints*) muestra PK, FK, CHECK y UNIQUE.

---

## Fase 3 — Datos de prueba

Inserta pocos datos pero **coherentes**. No sirve un total de 1700 si el
detalle suma 3400: el profesor lo va a revisar.

### 3.1 El truco de los IDs manuales

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

## Fase 4 — Las consultas

No empieces por el SQL. Empieza por la **pregunta**:

> "Quiero ver qué equipos no se han devuelto, de qué cliente y con qué teléfono."

### 4.1 Método en 5 pasos

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

### 4.2 Si la consulta no trae filas

No es un error de sintaxis, es un error de **lógica**. Ve quitando piezas:

1. `SELECT * FROM detalle_renta;` → ¿hay datos?
2. Agrega un JOIN a la vez → ¿en cuál desaparecen las filas?
3. Revisa el `WHERE`.

### 4.3 Para agrupar

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

## Fase 5 — Vista y triggers (cuando lo básico ya funciona)

**Nunca empieces por aquí.** Primero haz que las tablas y consultas funcionen.

### 5.1 ¿Por qué una vista?

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

### 5.2 ¿Por qué un trigger?

Porque hay reglas que deben cumplirse **aunque el dato no venga de la
aplicación**. Si alguien inserta desde pgAdmin, el trigger igual se ejecuta.

**Checkpoint 5:** rentas un equipo a mano en pgAdmin y el `disponible` baja; lo
devuelves y sube.

---

## Fase 6 — El proyecto Python

### 6.1 Entorno virtual

```powershell
mkdir renta\backend
cd renta\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

La línea ahora empieza con `(.venv)`. Si no, no instales nada: se iría a tu
Python global.

### 6.2 Dependencias

Crea `requirements.txt` y luego:

```powershell
pip install -r requirements.txt
```

No instales con `pip install fastapi` a secas: dentro de un mes no recordarás
qué versión usaste.

### 6.3 El `.env`

```
DATABASE_URL=postgresql://postgres:TU_CONTRASENA@localhost:5432/renta_equipos
SECRET_KEY=una-cadena-larga-y-aleatoria
```

Ese archivo **nunca** va a Git. Se comparte `.env.example` sin contraseña.
`SECRET_KEY` firma la cookie de sesión: si la cambias, se cierran todas las
sesiones abiertas.

### 6.4 Primera conexión (antes de FastAPI)

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

## Fase 7 — La API, de menos a más

### 7.1 Hola mundo

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

### 7.2 Un endpoint que lee la base

```python
@app.get("/equipos")
def equipos():
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM equipo")
        return cur.fetchall()
```

### 7.3 Separar en archivos

Cuando `main.py` pasa de 100 líneas, divide: un archivo por entidad en
`routers/`. No lo hagas antes de tiempo.

### 7.4 Validar con Pydantic

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

## Fase 8 — El proceso central (la parte que importa)

Aquí es donde un proyecto escolar se distingue. Crear una renta no es un
`INSERT`: es una **operación**.

### 8.1 Escribir la lista de pasos ANTES del código

1. ¿El cliente existe y está activo?
2. ¿Hay unidades disponibles de cada equipo?
3. ¿Cuál es el precio? (se lee de la base, no del formulario)
4. ¿Cuántos días son? (mínimo 1)
5. Insertar la renta.
6. Insertar cada detalle.
7. Confirmar todo junto.

### 8.2 La transacción

```python
with db.transaction():
    with db.cursor() as cur:
        # ... todos los INSERT ...
```

- Si el bloque termina bien → `COMMIT`.
- Si cualquier línea lanza excepción → `ROLLBACK` y **nada** se guardó.

Sin `with db.transaction()`, un fallo en el tercer equipo dejaría una renta con
dos renglones: datos corruptos.

### 8.3 La condición de carrera

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

### 8.4 Nunca confíes en el cliente

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

## Fase 9 — Reportes

Cada consulta de la Fase 4 se convierte en un endpoint que devuelve
`cur.fetchall()`. No hay lógica nueva: es la misma SQL.

Si el reporte necesita parámetros (`id_cliente`, `limite`), van como parámetros
de la ruta o query string, **nunca** concatenados en el SQL.

---

## Fase 10 — El front

### 10.1 El orden correcto

1. HTML estático con datos inventados → se ve bien.
2. Reemplazar los datos por `fetch` → ya es dinámico.
3. Formularios.
4. Estados de carga y error.

Si empiezas por el `fetch`, depuras dos cosas a la vez.

### 10.2 La petición mínima

```js
const respuesta = await fetch("http://localhost:8000/api/equipos");
if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
const equipos = await respuesta.json();
```

### 10.3 CORS

Si el HTML se abre en `:5500` y la API en `:8000`, son orígenes distintos y el
navegador bloquea. Se resuelve con `CORSMiddleware` en FastAPI. Si sirves el
front desde el mismo servidor (`StaticFiles`), no hay problema.

**Checkpoint 10:** la tabla muestra los equipos reales y la consola del
navegador (`F12`) no tiene errores rojos.

### 10.4 Login y dos roles (cuando el CRUD ya funciona)

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

## Fase 11 — Probar

### 11.1 Prueba manual ordenada

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

### 11.2 Prueba automatizada

Un script que recorre esos casos y compara resultados vale más que veinte
capturas de pantalla. Es lo que hace `backend/scripts/prueba_api.py`.

---

## Fase 12 — Git

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

## Fase 13 — Cuando algo falla

### 13.1 Leer un traceback

Se lee **de abajo hacia arriba**:

```
File "app/routers/rentas.py", line 87, in crear      ← tu código
    cur.execute("INSERT INTO detaile_renta ...")
psycopg.errors.UndefinedTable: relation "detaile_renta" does not exist
```

- La última línea dice **qué** pasó.
- La línea de arriba dice **dónde**.

Aquí: escribiste mal el nombre de la tabla.

### 13.2 Tabla de diagnóstico

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

### 13.3 Las tres preguntas

1. **¿Qué esperaba que pasara?**
2. **¿Qué pasó realmente?** (mensaje exacto, no "no funciona")
3. **¿Cuál es la diferencia más pequeña?** Prueba esa.

---

## Apéndice A — Comandos de psql que vas a usar

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

## Apéndice B — Cómo auditar código que no escribiste (incluida la IA)

Este apéndice responde a la pregunta "¿cómo intervengo cuando el agente se
equivoca?". El ejemplo es real y salió de este proyecto.

### El caso

La vista `v_equipo_disponible` calculaba las unidades ocupadas así:

```sql
SUM(d.cantidad) FILTER (WHERE er.estado IN ('Reservada','Activa'))
```

Parece correcto: suma lo que está en rentas activas. Pero **ignora la fecha de
devolución**. Si un equipo ya se devolvió y la renta sigue "Activa" (porque otra
línea no ha regresado), esa unidad sigue contando como ocupada.

### Cómo se detectó

No se detectó leyendo el SQL. Se detectó **ejecutando**:

```
Paso 4: rentar 2 bocinas  → disponible 4 → 2   ✅
Paso 6: devolverlas       → disponible 2 → 2   ❌ debería ser 4
```

Una prueba con una expectativa escrita. Eso es todo.

### La corrección

```sql
SUM(d.cantidad) FILTER (
    WHERE d.fecha_devolucion IS NULL
      AND er.estado IN ('Reservada','Activa'))
```

### La lección

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

### Lista de verificación para revisar código generado

1. **¿Entiendo qué hace cada línea?** Si no, no lo apruebes.
2. **¿Los nombres coinciden con la base?** PostgreSQL es sensible a eso.
3. **¿Usa `%s` o concatena strings?** Concatenar = inyección SQL.
4. **¿Lee el precio del cliente?** Debe leerlo de la base.
5. **¿Abre transacción en operaciones múltiples?** Si no, quedan datos a medias.
6. **¿Qué pasa si el dato no existe?** Debe devolver 404, no reventar.
7. **¿Hay un caso de prueba que lo demuestre?** Si no, escríbelo.
8. **¿Puedo romperlo a propósito?** Intenta. Si no se rompe donde debería, algo
   falta.
