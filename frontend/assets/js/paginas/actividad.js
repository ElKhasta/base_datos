/* =====================================================================
   Pantalla: Actividad (auditoría)
   ---------------------------------------------------------------------
   Lee GET /api/auditoria con filtros y paginación por offset.
   Cada fila es un evento inmutable: acción, entidad, usuario y detalle.
   ===================================================================== */

const { fechaHora, escapar, toast, error, debounce } = Comun;

const feed = document.getElementById("feedActividad");
const filtroAccion = document.getElementById("filtroAccion");
const filtroEntidad = document.getElementById("filtroEntidad");
const btnCargarMas = document.getElementById("btnCargarMas");
const contador = document.getElementById("contadorActividad");

const LIMITE = 25;

const estado = {
  eventos: [],
  total: 0,
  offset: 0,
  cargando: false,
};

/* ------------------------- Presentación de acciones ------------------------- */
const ACCIONES = {
  solicitar_renta:      { icono: "bi-send",              color: "#f59e0b", texto: "Solicitud enviada" },
  crear_renta:          { icono: "bi-clipboard-plus",    color: "#6d28d9", texto: "Renta creada" },
  aprobar_solicitud:    { icono: "bi-check2-circle",     color: "#059669", texto: "Solicitud aprobada" },
  rechazar_solicitud:   { icono: "bi-x-circle",          color: "#dc2626", texto: "Solicitud rechazada" },
  cancelar_renta:       { icono: "bi-slash-circle",      color: "#6b7280", texto: "Renta cancelada" },
  cambiar_estado:       { icono: "bi-arrow-repeat",      color: "#2563eb", texto: "Cambio de estado" },
  registrar_devolucion: { icono: "bi-box-arrow-in-down", color: "#0891b2", texto: "Devolución registrada" },
  eliminar_renta:       { icono: "bi-trash",             color: "#dc2626", texto: "Renta eliminada" },
  registrar_pago:       { icono: "bi-cash-coin",         color: "#059669", texto: "Pago registrado" },
  crear_cliente:        { icono: "bi-person-plus",       color: "#6d28d9", texto: "Cliente creado" },
  actualizar_cliente:   { icono: "bi-pencil-square",     color: "#2563eb", texto: "Cliente actualizado" },
  baja_cliente:         { icono: "bi-person-dash",       color: "#dc2626", texto: "Cliente dado de baja" },
  crear_acceso:         { icono: "bi-key",               color: "#7c3aed", texto: "Acceso creado" },
  reactivar_acceso:     { icono: "bi-key-fill",          color: "#0891b2", texto: "Acceso reactivado" },
  revocar_acceso:       { icono: "bi-key",               color: "#dc2626", texto: "Acceso revocado" },
  crear_equipo:         { icono: "bi-plus-square",       color: "#6d28d9", texto: "Equipo creado" },
  actualizar_equipo:    { icono: "bi-pencil-square",     color: "#2563eb", texto: "Equipo actualizado" },
  eliminar_equipo:      { icono: "bi-trash",             color: "#dc2626", texto: "Equipo eliminado" },
  crear_categoria:      { icono: "bi-tag",               color: "#6d28d9", texto: "Categoría creada" },
  actualizar_categoria: { icono: "bi-tag",               color: "#2563eb", texto: "Categoría actualizada" },
  eliminar_categoria:   { icono: "bi-trash",             color: "#dc2626", texto: "Categoría eliminada" },
  login:                { icono: "bi-box-arrow-in-right", color: "#0891b2", texto: "Inicio de sesión" },
  logout:               { icono: "bi-box-arrow-right",   color: "#6b7280", texto: "Cierre de sesión" },
};

function presentarAccion(accion) {
  return ACCIONES[accion] || {
    icono: "bi-activity",
    color: "#6d28d9",
    texto: accion.replaceAll("_", " "),
  };
}

/* --------------------------------- Carga --------------------------------- */
async function cargar({ reiniciar = false } = {}) {
  if (estado.cargando) return;
  estado.cargando = true;

  if (reiniciar) {
    estado.eventos = [];
    estado.offset = 0;
    feed.innerHTML = `<div class="text-center text-muted py-5">
        <span class="spinner-border spinner-border-sm me-2"></span>Cargando actividad…
      </div>`;
  }

  btnCargarMas.disabled = true;

  try {
    const datos = await Api.auditoria.listar({
      accion: filtroAccion.value,
      entidad: filtroEntidad.value,
      limite: LIMITE,
      offset: estado.offset,
    });

    estado.total = datos.total;
    estado.eventos = estado.eventos.concat(datos.resultados);
    estado.offset += datos.resultados.length;

    pintar();
  } catch (e) {
    if (!estado.eventos.length) {
      feed.innerHTML = `<div class="alert alert-danger mb-0">${escapar(e.message)}</div>`;
    }
    error(e);
  } finally {
    estado.cargando = false;
    btnCargarMas.disabled = false;
  }
}

function pintar() {
  contador.textContent =
    `${estado.eventos.length} de ${estado.total} evento${estado.total === 1 ? "" : "s"}`;

  if (!estado.eventos.length) {
    feed.innerHTML = `<div class="text-center text-muted py-5">
        <i class="bi bi-activity fs-2 d-block mb-2"></i>
        No hay actividad registrada con esos filtros.
      </div>`;
    btnCargarMas.classList.add("d-none");
    return;
  }

  feed.innerHTML = estado.eventos.map((a) => {
    const meta = presentarAccion(a.accion);
    const rol = a.rol
      ? `<span class="badge ${a.rol === "admin" ? "text-bg-danger" : "text-bg-info"}">
           ${a.rol === "admin" ? "Administrador" : "Cliente"}
         </span>`
      : "";

    return `
      <div class="feed-item">
        <div class="feed-icono" style="color: ${meta.color}; background: ${meta.color}18;">
          <i class="bi ${meta.icono}"></i>
        </div>

        <div>
          <div class="d-flex flex-wrap align-items-center gap-2">
            <span class="fw-semibold">${escapar(meta.texto)}</span>
            <span class="accion-chip">${escapar(a.accion)}</span>
            ${rol}
          </div>

          <div class="small mt-1">
            ${escapar(a.usuario) || "Sistema"}
            ${a.usuario_email ? `<span class="celda-secundaria">· ${escapar(a.usuario_email)}</span>` : ""}
            <span class="celda-secundaria">
              · ${escapar(a.entidad)}${a.id_entidad ? ` #${a.id_entidad}` : ""}
            </span>
          </div>

          ${a.detalle
            ? `<div class="celda-secundaria mt-1">${escapar(a.detalle)}</div>`
            : ""}
        </div>

        <div class="text-end celda-secundaria text-nowrap">
          ${fechaHora(a.fecha)}
        </div>
      </div>`;
  }).join("");

  btnCargarMas.classList.toggle("d-none", estado.offset >= estado.total);
}

/* --------------------------------- Eventos --------------------------------- */
btnCargarMas.addEventListener("click", () => cargar());

filtroAccion.addEventListener("change", () => cargar({ reiniciar: true }));
filtroEntidad.addEventListener("change", () => cargar({ reiniciar: true }));

document.getElementById("btnRecargarActividad").addEventListener("click", () => {
  cargar({ reiniciar: true });
});

/* --------------------------------- Arranque --------------------------------- */
(async function iniciar() {
  try {
    const acciones = await Api.auditoria.acciones();
    filtroAccion.innerHTML = ['<option value="">Todas las acciones</option>']
      .concat(acciones.map((a) =>
        `<option value="${escapar(a)}">${escapar(presentarAccion(a).texto)}</option>`
      ))
      .join("");
  } catch {
    /* Si falla el catálogo de acciones, el filtro queda con "Todas". */
  }

  await cargar({ reiniciar: true });
})();
