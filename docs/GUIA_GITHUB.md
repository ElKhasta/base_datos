# Cómo compartir el proyecto con el equipo (GitHub)

## Antes de empezar: la carpeta de OneDrive

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

## 1. Qué se sube y qué NO

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

## 2. Crear el repositorio

### 2.1 En la web de GitHub

1. Entra a <https://github.com> → **New repository**.
2. Nombre: `renta-equipos`.
3. Visibilidad: **Private** (privado) mientras sea trabajo escolar.
4. **No** marques "Add a README" ni ".gitignore" (ya los tenemos).
5. **Create repository**.

### 2.2 En tu computadora

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

## 3. Invitar a tus compañeros

En el repositorio: **Settings** → **Collaborators** → **Add people** →
escribe su usuario de GitHub → **Add collaborator**.

Cada uno acepta la invitación por correo o en
`https://github.com/notifications`.

---

## 4. Flujo de trabajo diario

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

## 5. Qué hace cada compañero al clonar

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

## 6. No se sube la base de datos... ¿y entonces?

La base se **reconstruye** con los scripts:

```
sql/01_esquema.sql  +  sql/02_datos.sql
```

Por eso es importante que esos archivos estén siempre actualizados: son la
"receta" de la base. Si alguien cambia una tabla, debe modificar
`01_esquema.sql` y avisar al equipo para que vuelva a ejecutarlo.

---

## 7. Alternativa sin GitHub

Si el profesor no permite repositorios, comparte un `.zip` **sin** `backend/.venv`:

```powershell
# Desde la carpeta padre
Compress-Archive -Path "renta-equipos" -DestinationPath "renta-equipos.zip" -Force
```

Pero se pierde el historial de cambios y es fácil que alguien sobrescriba el
trabajo del otro. GitHub es claramente mejor.
