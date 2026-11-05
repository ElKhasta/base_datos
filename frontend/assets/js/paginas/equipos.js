/* =====================================================================
   Pantalla: Equipos + catálogo de categorías
   La disponibilidad la calcula PostgreSQL; aquí solo se muestra.
   ===================================================================== */

const { dinero, escapar, toast, error, confirmar, filaCargando, filaVacia,
        debounce, llenarSelect } = Comun;

const tablaEquipos = document.getElementById("tablaEquipos");
const tablaCategorias = document.getElementById("tablaCategorias");
const contadorEquipos = document.getElementById("contadorEquipos");
const buscar = document.getElementById("buscarEquipo");
const filtroCategoria = document.getElementById("filtroCategoria");
const soloDisponibles = document.getElementById("soloDisponibles");

const formEquipo = document.getElementById("formEquipo");
const btnGuardarEquipo = document.getElementById("btnGuardarEquipo");

const formCategoria = document.getElementById("formCategoria");
const btnGuardarCategoria = document.getElementById("btnGuardarCategoria");
const btnCancelarCategoria = document.getElementById("btnCancelarCategoria");

const modalEquipo = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalEquipo"));
const modalCategorias = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalCategorias"));

let equipos = [];
let categorias = [];

/* ============================== CATEGORÍAS ============================== */
async function cargarCategorias() {
  try {
    categorias = await Api.categorias.listar();

    const opciones = categorias.map((c) => ({ valor: c.id_categoria, texto: c.nombre_categoria }));
    llenarSelect(filtroCategoria, opciones, { placeholder: "Todas las categorías" });
    llenarSelect(document.getElementById("equipoCategoria"), opciones,
                 { placeholder: "Selecciona una categoría…" });

    pintarCategorias();
  } catch (e) {
    error(e);
    tablaCategorias.innerHTML = filaVacia(4, "No se pudieron cargar las categorías");
  }
}

function pintarCategorias() {
  tablaCategorias.innerHTML = categorias.map((c) => {
    const usados = equipos.filter((e) => e.id_categoria === c.id_categoria).length;
    return `
      <tr>
        <td class="celda-principal">${escapar(c.nombre_categoria)}</td>
        <td class="celda-secundaria">${escapar(c.descripcion) || "—"}</td>
        <td class="text-center">
          <span class="badge ${usados ? "badge-suave" : "text-bg-light"}">${usados}</span>
        </td>
        <td class="text-end acciones-tabla">
          <button class="btn btn-outline-primary" data-accion="editar-categoria"
                  data-id="${c.id_categoria}" title="Editar" aria-label="Editar categoría">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger" data-accion="eliminar-categoria"
                  data-id="${c.id_categoria}" title="Eliminar" aria-label="Eliminar categoría">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join("") || filaVacia(4, "Todavía no hay categorías");
}

function limpiarFormCategoria() {
  formCategoria.reset();
  formCategoria.classList.remove("was-validated");
  document.getElementById("categoriaId").value = "";
  document.getElementById("tituloFormCategoria").textContent = "Nueva categoría";
  btnGuardarCategoria.textContent = "Guardar";
  btnCancelarCategoria.classList.add("d-none");
}

function editarCategoria(categoria) {
  document.getElementById("categoriaId").value = categoria.id_categoria;
  document.getElementById("categoriaNombre").value = categoria.nombre_categoria;
  document.getElementById("categoriaDescripcion").value = categoria.descripcion ?? "";
  document.getElementById("tituloFormCategoria").textContent = "Editar categoría";
  btnGuardarCategoria.textContent = "Actualizar";
  btnCancelarCategoria.classList.remove("d-none");
  document.getElementById("categoriaNombre").focus();
}

formCategoria.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!formCategoria.checkValidity()) {
    formCategoria.classList.add("was-validated");
    return;
  }

  const id = document.getElementById("categoriaId").value;
  const payload = {
    nombre_categoria: document.getElementById("categoriaNombre").value.trim(),
    descripcion: document.getElementById("categoriaDescripcion").value.trim() || null,
  };

  btnGuardarCategoria.disabled = true;
  try {
    if (id) {
      await Api.categorias.editar(id, payload);
      toast("Categoría actualizada");
    } else {
      await Api.categorias.crear(payload);
      toast("Categoría creada");
    }
    limpiarFormCategoria();
    await cargarCategorias();
    await cargarEquipos(); // los nombres de categoría pueden haber cambiado
  } catch (e) {
    error(e);
  } finally {
    btnGuardarCategoria.disabled = false;
  }
});

btnCancelarCategoria.addEventListener("click", limpiarFormCategoria);

tablaCategorias.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const categoria = categorias.find((c) => c.id_categoria === Number(boton.dataset.id));
  if (!categoria) return;

  try {
    if (boton.dataset.accion === "editar-categoria") {
      editarCategoria(categoria);
      return;
    }

    const usados = equipos.filter((e) => e.id_categoria === categoria.id_categoria).length;
    const ok = await confirmar({
      titulo: "Eliminar categoría",
      texto: usados
        ? `<strong>${escapar(categoria.nombre_categoria)}</strong> tiene ${usados} equipo(s).
           La base de datos rechazará el borrado hasta que los reasignes o los elimines.`
        : `¿Eliminar <strong>${escapar(categoria.nombre_categoria)}</strong>? Esta acción no se puede deshacer.`,
      boton: "Eliminar",
      peligro: true,
    });
    if (!ok) return;

    await Api.categorias.eliminar(categoria.id_categoria);
    toast("Categoría eliminada");
    await cargarCategorias();
    await cargarEquipos();
  } catch (e) {
    error(e);
  }
});

/* ================================ EQUIPOS ================================ */
async function cargarEquipos() {
  tablaEquipos.innerHTML = filaCargando(7);

  try {
    equipos = await Api.equipos.listar({
      q: buscar.value.trim(),
      id_categoria: filtroCategoria.value,
      disponibles: soloDisponibles.checked ? true : "",
    });

    pintarEquipos();
    pintarCategorias(); // actualiza el conteo de equipos por categoría
  } catch (e) {
    tablaEquipos.innerHTML = filaVacia(7, "No se pudieron cargar los equipos");
    contadorEquipos.textContent = "—";
    error(e);
  }
}

function pintarEquipos() {
  contadorEquipos.textContent = `${equipos.length} equipo${equipos.length === 1 ? "" : "s"}`;

  tablaEquipos.innerHTML = equipos.map((e) => {
    const libre = e.disponible > 0;
    return `
      <tr>
        <td>
          <div class="celda-principal">${escapar(e.nombre)}</div>
          <div class="celda-secundaria">${escapar(e.marca) || "Sin marca"}</div>
        </td>
        <td><span class="badge badge-suave">${escapar(e.nombre_categoria)}</span></td>
        <td class="text-end">${dinero(e.precio_renta_diario)}</td>
        <td class="text-center">${e.stock}</td>
        <td class="text-center">${e.unidades_rentadas}</td>
        <td class="text-center">
          <span class="badge ${libre ? "text-bg-success" : "text-bg-danger"} badge-estado">
            ${e.disponible}
          </span>
        </td>
        <td class="text-end acciones-tabla no-print">
          <button class="btn btn-outline-primary" data-accion="editar" data-id="${e.id_equipo}"
                  title="Editar" aria-label="Editar equipo">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger" data-accion="eliminar" data-id="${e.id_equipo}"
                  title="Eliminar" aria-label="Eliminar equipo">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join("") || filaVacia(7, "No se encontraron equipos con ese filtro");
}

function abrirFormulario(equipo = null) {
  if (categorias.length === 0) {
    toast("Primero crea al menos una categoría", "warning");
    modalCategorias.show();
    return;
  }

  formEquipo.reset();
  formEquipo.classList.remove("was-validated");

  document.getElementById("equipoId").value = equipo ? equipo.id_equipo : "";
  document.getElementById("tituloModalEquipo").textContent =
    equipo ? "Editar equipo" : "Nuevo equipo";

  document.getElementById("equipoCategoria").value = equipo ? equipo.id_categoria : "";
  document.getElementById("equipoNombre").value = equipo?.nombre ?? "";
  document.getElementById("equipoMarca").value = equipo?.marca ?? "";
  document.getElementById("equipoPrecio").value = equipo?.precio_renta_diario ?? "";
  document.getElementById("equipoStock").value = equipo?.stock ?? "";

  modalEquipo.show();
}

formEquipo.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!formEquipo.checkValidity()) {
    formEquipo.classList.add("was-validated");
    return;
  }

  const id = document.getElementById("equipoId").value;
  const payload = {
    id_categoria: Number(document.getElementById("equipoCategoria").value),
    nombre: document.getElementById("equipoNombre").value.trim(),
    marca: document.getElementById("equipoMarca").value.trim() || null,
    precio_renta_diario: Number(document.getElementById("equipoPrecio").value),
    stock: Number(document.getElementById("equipoStock").value),
  };

  btnGuardarEquipo.disabled = true;
  try {
    if (id) {
      await Api.equipos.editar(id, payload);
      toast("Equipo actualizado");
    } else {
      await Api.equipos.crear(payload);
      toast("Equipo registrado");
    }
    modalEquipo.hide();
    await cargarEquipos();
  } catch (e) {
    error(e);
  } finally {
    btnGuardarEquipo.disabled = false;
  }
});

tablaEquipos.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const equipo = equipos.find((e) => e.id_equipo === Number(boton.dataset.id));
  if (!equipo) return;

  try {
    if (boton.dataset.accion === "editar") {
      abrirFormulario(equipo);
      return;
    }

    const ok = await confirmar({
      titulo: "Eliminar equipo",
      texto: `¿Eliminar <strong>${escapar(equipo.nombre)}</strong>?
              Si tiene rentas asociadas, la base de datos rechazará el borrado.`,
      boton: "Eliminar",
      peligro: true,
    });
    if (!ok) return;

    await Api.equipos.eliminar(equipo.id_equipo);
    toast("Equipo eliminado");
    await cargarEquipos();
  } catch (e) {
    error(e);
  }
});

/* ================================ EVENTOS ================================ */
document.getElementById("btnNuevoEquipo").addEventListener("click", () => abrirFormulario());
document.getElementById("btnCategorias").addEventListener("click", () => {
  limpiarFormCategoria();
  modalCategorias.show();
});

buscar.addEventListener("input", debounce(cargarEquipos, 300));
filtroCategoria.addEventListener("change", cargarEquipos);
soloDisponibles.addEventListener("change", cargarEquipos);

/* ================================= INICIO ================================= */
(async function iniciar() {
  await cargarCategorias();
  await cargarEquipos();
})();
