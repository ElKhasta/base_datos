/* =====================================================================
   Pantalla: Solicitudes (administrador)
   ---------------------------------------------------------------------
   Bandeja de entrada de las solicitudes creadas por los clientes.
   Aprobar revalida el stock en el backend; rechazar exige un motivo.

   El listado se carga completo y se filtra en el navegador para que las
   métricas (pendientes, monto, aprobadas) siempre sean coherentes.
   ===================================================================== */

const { dinero, fecha, fechaHora, badgeEstado, escapar, toast, error,
        confirmar, filaCargando, filaVacia, debounce } = Comun;

const tabla = document.getElementById("tablaSolicitudes");
const contador = document.getElementById("contadorSolicitudes");
const buscar = document.getElementById("buscarSolicitud");
const filtroEstado = document.getElementById("filtroEstado");

const modalSolicitud = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalSolicitud")
);
const detalle = document.getElementById("detalleSolicitud");
const zonaAprobar = document.getElementById("zonaAprobar");
const zonaCerrada = document.getElementById("zonaCerrada");
const zonaRechazo = document.getElementById("zonaRechazo");
const motivoRechazo = document.getElementById("motivoRechazo");
const btnConfirmarRechazo = document.getElementById("btnConfirmarRechazo");

let solicitudes = [];
let actual = null;
let numeroPeticion = 0;

/* ================================ LISTADO ================================ */
async function cargar() {
  const miPeticion = ++numeroPeticion;
  tabla.innerHTML = filaCargando(7);

  try {
    const datos = await Api.rentas.listar();
    if (miPeticion !== numeroPeticion) return;

    solicitudes = datos;
    pintarMetricas();
    pintarTabla();
  } catch (e) {
    if (miPeticion !== numeroPeticion) return;
    tabla.innerHTML = filaVacia(7, "No se pudieron cargar las solicitudes");
    contador.textContent = "—";
    error(e);
  }
}

function visibles() {
  const estado = filtroEstado.value;
  const texto = buscar.value.trim().toLowerCase();

  return solicitudes.filter((r) => {
    if (estado && r.estado !== estado) return false;
    if (!texto) return true;
    return `${r.id_renta} ${r.cliente}`.toLowerCase().includes(texto);
  });
}

function pintarMetricas() {
  const pendientes = solicitudes.filter((r) => r.estado === "Solicitada");
  const aprobadas = solicitudes.filter((r) =>
    ["Reservada", "Activa", "Finalizada"].includes(r.estado)
  ).length;
  const montoPendiente = pendientes.reduce((s, r) => s + Number(r.monto_total), 0);

  document.getElementById("mPendientes").textContent = pendientes.length;
  document.getElementById("mTotal").textContent = solicitudes.length;
  document.getElementById("mMontoPendiente").textContent = dinero(montoPendiente);
  document.getElementById("mAprobadas").textContent = aprobadas;

  const aviso = document.getElementById("avisoPendientes");
  aviso.classList.toggle("d-none", pendientes.length === 0);
  aviso.classList.toggle("d-flex", pendientes.length > 0);

  if (pendientes.length) {
    document.getElementById("textoPendientes").innerHTML =
      `Hay <strong>${pendientes.length}</strong> solicitud${pendientes.length === 1 ? "" : "es"}
       esperando revisión por <strong>${dinero(montoPendiente)}</strong>.`;
  }
}

function pintarTabla() {
  const filas = visibles();
  contador.textContent = `${filas.length} solicitud${filas.length === 1 ? "" : "es"}`;

  tabla.innerHTML = filas.map((r) => {
    const pendiente = r.estado === "Solicitada";
    return `
      <tr class="${pendiente ? "fila-pendiente" : ""}">
        <td>
          <a href="#" class="fw-semibold" data-detalle="${r.id_renta}">#${r.id_renta}</a>
        </td>
        <td>
          <div class="celda-principal">${escapar(r.cliente)}</div>
          <div class="celda-secundaria">${escapar(r.telefono) || "Sin teléfono"}</div>
        </td>
        <td>
          <div>${fechaHora(r.fecha_registro)}</div>
          <div class="celda-secundaria">${r.solicitante ? `por ${escapar(r.solicitante)}` : ""}</div>
        </td>
        <td>
          <div>${fecha(r.fecha_inicio)}</div>
          <div class="celda-secundaria">al ${fecha(r.fecha_fin_estimada)}</div>
        </td>
        <td class="text-end fw-semibold">${dinero(r.monto_total)}</td>
        <td>${badgeEstado(r.estado)}</td>
        <td class="text-end acciones-tabla no-print">
          <button class="btn ${pendiente ? "btn-primary" : "btn-outline-primary"}"
                  data-detalle="${r.id_renta}">
            <i class="bi ${pendiente ? "bi-inbox" : "bi-eye"} me-1"></i>
            ${pendiente ? "Revisar" : "Ver"}
          </button>
        </td>
      </tr>`;
  }).join("") || filaVacia(7, "No hay solicitudes con ese filtro");
}

/* ================================ DETALLE ================================ */
async function abrir(id) {
  actual = null;
  zonaAprobar.classList.add("d-none");
  zonaCerrada.classList.add("d-none");
  zonaRechazo.classList.add("d-none");
  motivoRechazo.value = "";
  motivoRechazo.classList.remove("is-invalid");
  document.getElementById("tituloSolicitud").textContent = `Solicitud #${id}`;

  modalSolicitud.show();
  detalle.innerHTML = `<div class="text-center text-muted py-4">
      <span class="spinner-border spinner-border-sm me-2"></span>Cargando…
    </div>`;

  try {
    actual = await Api.rentas.obtener(id);
    pintarDetalle();
  } catch (e) {
    detalle.innerHTML = `<div class="alert alert-danger mb-0">${escapar(e.message)}</div>`;
    zonaCerrada.classList.remove("d-none");
    error(e);
  }
}

function pintarDetalle() {
  const r = actual;
  const pendiente = r.estado === "Solicitada";

  const filas = r.detalles.map((d) => `
    <tr>
      <td>
        <div class="celda-principal">${escapar(d.equipo)}</div>
        <div class="celda-secundaria">${escapar(d.marca) || "Sin marca"}</div>
      </td>
      <td class="text-center">${d.cantidad}</td>
      <td class="text-end">${dinero(d.precio_unitario)}</td>
      <td class="text-end">${dinero(d.subtotal)}</td>
    </tr>`).join("");

  const seguimiento = `
    <li>
      <span class="punto"><i class="bi bi-send"></i></span>
      <div>
        <div class="fw-semibold">Solicitud enviada</div>
        <div class="celda-secundaria">
          ${fechaHora(r.fecha_registro)}${r.solicitante ? ` · ${escapar(r.solicitante)}` : ""}
        </div>
      </div>
    </li>
    ${r.fecha_aprobacion
      ? `<li>
           <span class="punto"><i class="bi ${r.estado === "Cancelada" ? "bi-x-lg" : "bi-check-lg"}"></i></span>
           <div>
             <div class="fw-semibold">
               ${r.estado === "Cancelada" ? "Rechazada / cancelada" : "Aprobada"}
             </div>
             <div class="celda-secundaria">
               ${fechaHora(r.fecha_aprobacion)}${r.aprobador ? ` · ${escapar(r.aprobador)}` : ""}
             </div>
             ${r.motivo_rechazo ? `<div class="small mt-1">${escapar(r.motivo_rechazo)}</div>` : ""}
           </div>
         </li>`
      : ""}`;

  detalle.innerHTML = `
    <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
      <div>
        <h4 class="mb-1">Solicitud #${r.id_renta}</h4>
        <div class="text-muted">${escapar(r.cliente)} · ${escapar(r.telefono) || "sin teléfono"}</div>
        <div class="celda-secundaria">${escapar(r.cliente_email) || ""}</div>
      </div>
      ${badgeEstado(r.estado)}
    </div>

    ${r.motivo_rechazo && !pendiente
      ? `<div class="alert alert-warning py-2 px-3 small">
           <strong>Motivo:</strong> ${escapar(r.motivo_rechazo)}
         </div>`
      : ""}

    <div class="row g-3 mb-4">
      <div class="col-sm-4">
        <div class="border rounded-3 p-3 h-100">
          <div class="text-muted small">Periodo</div>
          <div class="fw-semibold">${fecha(r.fecha_inicio)} → ${fecha(r.fecha_fin_estimada)}</div>
        </div>
      </div>
      <div class="col-sm-4">
        <div class="border rounded-3 p-3 h-100">
          <div class="text-muted small">Total</div>
          <div class="fw-semibold">${dinero(r.monto_total)}</div>
        </div>
      </div>
      <div class="col-sm-4">
        <div class="border rounded-3 p-3 h-100">
          <div class="text-muted small">Pagado</div>
          <div class="fw-semibold text-success">${dinero(r.pagado)}</div>
        </div>
      </div>
    </div>

    <h6 class="text-uppercase text-muted small fw-bold">Equipos solicitados</h6>
    <div class="table-responsive mb-4">
      <table class="table align-middle tabla-datos mb-0">
        <thead>
          <tr>
            <th>Equipo</th>
            <th class="text-center">Cant.</th>
            <th class="text-end">Precio/día</th>
            <th class="text-end">Subtotal</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>

    <h6 class="text-uppercase text-muted small fw-bold">Seguimiento</h6>
    <ul class="timeline mt-2 mb-0">${seguimiento}</ul>

    ${pendiente
      ? `<div class="alert alert-info mt-4 mb-0 small">
           <i class="bi bi-shield-check me-1"></i>
           Al aprobar, el servidor revalida el inventario y bloquea las unidades.
           Si ya no alcanza el stock, la operación se cancela sin cambios.
         </div>`
      : ""}`;

  zonaAprobar.classList.toggle("d-none", !pendiente);
  zonaCerrada.classList.toggle("d-none", pendiente);
}

/* ================================ ACCIONES ================================ */
async function aprobar(nuevoEstado) {
  if (!actual) return;

  const etiqueta = nuevoEstado === "Activa"
    ? "los equipos se entregarán de inmediato"
    : "los equipos se apartarán sin entregarlos";

  const ok = await confirmar({
    titulo: `Aprobar solicitud #${actual.id_renta}`,
    texto: `La renta pasará a <strong>${nuevoEstado}</strong> y ${etiqueta}.
            El inventario se revalidará en este momento.`,
    boton: "Aprobar",
  });
  if (!ok) return;

  try {
    await Api.rentas.aprobar(actual.id_renta, nuevoEstado);
    toast(`Solicitud #${actual.id_renta} aprobada como ${nuevoEstado}`);
    modalSolicitud.hide();
    Comun.actualizarBadge();
    await cargar();
  } catch (e) {
    error(e);
  }
}

async function rechazar() {
  if (!actual) return;

  const motivo = motivoRechazo.value.trim();
  motivoRechazo.classList.toggle("is-invalid", motivo.length < 3);
  if (motivo.length < 3) {
    motivoRechazo.focus();
    return;
  }

  const ok = await confirmar({
    titulo: `Rechazar solicitud #${actual.id_renta}`,
    texto: `El cliente verá el motivo: <em>"${escapar(motivo)}"</em>.<br><br>
            La solicitud quedará <strong>Cancelada</strong> y no se tocará el inventario.`,
    boton: "Rechazar",
    peligro: true,
  });
  if (!ok) return;

  btnConfirmarRechazo.disabled = true;
  try {
    await Api.rentas.rechazar(actual.id_renta, motivo);
    toast("Solicitud rechazada");
    modalSolicitud.hide();
    Comun.actualizarBadge();
    await cargar();
  } catch (e) {
    error(e);
  } finally {
    btnConfirmarRechazo.disabled = false;
  }
}

/* ================================ EVENTOS ================================ */
tabla.addEventListener("click", (evento) => {
  const objetivo = evento.target.closest("[data-detalle]");
  if (!objetivo) return;
  evento.preventDefault();
  abrir(Number(objetivo.dataset.detalle));
});

document.getElementById("accionesSolicitud").addEventListener("click", (evento) => {
  const aprobarBtn = evento.target.closest("[data-aprobar]");
  if (aprobarBtn) {
    aprobar(aprobarBtn.dataset.aprobar);
    return;
  }

  if (evento.target.closest("#btnMostrarRechazo")) {
    zonaRechazo.classList.remove("d-none");
    motivoRechazo.focus();
    return;
  }

  if (evento.target.closest("#btnCancelarRechazo")) {
    zonaRechazo.classList.add("d-none");
    motivoRechazo.classList.remove("is-invalid");
    return;
  }

  if (evento.target.closest("#btnConfirmarRechazo")) {
    rechazar();
  }
});

filtroEstado.addEventListener("change", pintarTabla);
buscar.addEventListener("input", debounce(pintarTabla, 250));
document.getElementById("btnRecargarSolicitudes").addEventListener("click", cargar);

cargar();
