# Ruta de aprendizaje

Qué estudiar, en qué orden y cómo practicarlo, para poder **construir y auditar**
sistemas como este sin depender de una herramienta.

---

## La idea que ordena todo

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

## Orden de estudio

### Nivel 0 — La terminal y el sistema operativo

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

### Nivel 1 — Python de verdad (sin frameworks)

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

### Nivel 2 — SQL y modelado de datos (el corazón)

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

### Nivel 3 — HTTP y la web

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

### Nivel 4 — Backend con Python

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

### Nivel 5 — Frontend

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

### Nivel 6 — Ingeniería de software

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

### Nivel 7 — Operación

| Tema | Nivel exigible |
|---|---|
| Docker | imagen, contenedor, `docker compose` para Postgres |
| Puertos y redes | mapeo, `localhost` dentro vs. fuera del contenedor |
| Respaldo y restauración | `pg_dump`, `pg_restore` |
| Despliegue | variables de entorno en el servidor, proceso persistente |
| Monitoreo | logs, salud del servicio |

---

### Nivel 8 — Seguridad (transversal, no opcional)

| Tema | Nivel exigible |
|---|---|
| Inyección SQL | por qué `%s` y nunca concatenar |
| Hash de contraseñas | `bcrypt`/`argon2`, nunca texto plano ni MD5 |
| Gestión de secretos | `.env`, no en Git, rotar si se filtra |
| Validación en servidor | el cliente es hostil por definición |
| Principio de mínimo privilegio | usuario de BD sin permisos de superusuario |
| OWASP Top 10 | al menos entender los cinco primeros |

---

## Cómo trabajar con agentes sin volverte dependiente

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

### Señales de que estás usando la IA mal

- No puedes explicar el código que entregas.
- Copias y pegas sin leer y luego "a ver si corre".
- Cuando falla, tu primer movimiento es pedir otra versión en vez de leer el
  error.
- No sabrías escribirlo de nuevo sin la herramienta.

### Señales de que la estás usando bien

- La usas para **acelerar** cosas que ya sabes hacer.
- La usas para **aprender**: "explícame por qué esto es así".
- Detectas sus errores antes de ejecutar.
- Puedes escribir la versión simple a mano.

---

## Plan sugerido a partir de hoy

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
