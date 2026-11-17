"""Genera DOCUMENTACION_COMPLETA.md a partir de todos los documentos del proyecto.

Uso (desde la raíz del repositorio):

    python scripts/generar_documentacion.py

No necesita dependencias externas. Si cambias un manual, vuelve a ejecutarlo
para que el documento único quede sincronizado.
"""
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = RAIZ / "DOCUMENTACION_COMPLETA.md"

PARTES = [
    ("vscode", "Guía de VS Code (empieza aquí)", "docs/GUIA_VSCODE.md"),
    ("readme", "Visión general y arranque", "README.md"),
    ("manual-usuario", "Manual de usuario", "docs/MANUAL_USUARIO.md"),
    ("roles", "Roles, permisos y sesión", "docs/ROLES.md"),
    ("api", "Contrato de la API", "docs/API.md"),
    ("frontend", "Guía del frontend", "docs/FRONTEND.md"),
    ("como-funciona", "Cómo funciona (explicación técnica)", "docs/COMO_FUNCIONA.md"),
    ("desde-cero", "Manual de construcción desde cero", "docs/MANUAL_DESDE_CERO.md"),
    ("ruta-aprendizaje", "Ruta de aprendizaje", "docs/RUTA_APRENDIZAJE.md"),
    ("evidencia", "Evidencia técnica (modelo y álgebra)", "docs/EVIDENCIA.md"),
    ("github", "Guía de GitHub y trabajo en equipo", "docs/GUIA_GITHUB.md"),
]

ENCABEZADO = """# RentaVisual — Documentación completa

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
"""

PIE = """
---

> **Este archivo se genera automáticamente.** No lo edites a mano: cambia el
> documento original y vuelve a ejecutar, desde la raíz:
>
> ```powershell
> python scripts/generar_documentacion.py
> ```
"""


def bajar_encabezados(texto: str) -> str:
    """Baja un nivel los títulos Markdown, salvo dentro de bloques de código."""
    salida = []
    en_codigo = False
    for linea in texto.splitlines():
        desnuda = linea.lstrip()
        if desnuda.startswith("```") or desnuda.startswith("~~~"):
            en_codigo = not en_codigo
            salida.append(linea)
            continue
        if not en_codigo:
            linea = re.sub(
                r"^(\s{0,3})(#{1,5})(\s)",
                lambda m: f"{m.group(1)}#{m.group(2)}{m.group(3)}",
                linea,
            )
        salida.append(linea)
    return "\n".join(salida)


def main() -> None:
    lineas = [ENCABEZADO]
    for numero, (ancla, titulo, ruta) in enumerate(PARTES):
        lineas.append(f"| [{numero}. {titulo}](#{ancla}) | `{ruta}` | Ver Parte {numero} |\n")

    lineas.append("\n---\n")

    for numero, (ancla, titulo, ruta) in enumerate(PARTES):
        contenido = (RAIZ / ruta).read_text(encoding="utf-8")
        contenido = bajar_encabezados(contenido)
        # Este archivo vive en la raíz: las imágenes están en docs/img/.
        contenido = contenido.replace("](img/", "](docs/img/")
        lineas.append(f'<a id="{ancla}"></a>\n\n')
        lineas.append(f"# Parte {numero} — {titulo}\n\n")
        lineas.append(contenido.strip() + "\n\n---\n")

    lineas.append(PIE)
    SALIDA.write_text("".join(lineas), encoding="utf-8")
    print(f"Generado: {SALIDA.relative_to(RAIZ)}")
    print(f"Partes incluidas: {len(PARTES)}")


if __name__ == "__main__":
    main()
