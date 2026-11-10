/* =====================================================================
   Pantalla: Portal del cliente
   ---------------------------------------------------------------------
   Tres pasos, todos contra la API real:
     1. Catálogo   -> GET /equipos + /categorias
     2. Solicitud  -> POST /rentas  (el backend fuerza estado "Solicitada")
     3. Historial  -> GET /rentas   (el backend filtra por el cliente)

   El carrito vive solo en memoria: no se aparta inventario hasta que el
   administrador aprueba la solicitud.
   ===================================================================== */

const { dinero, fecha, fechaHora, badgeEstado, escapar, toast, error,
        confirmar, hoyISO, sumarDias, diasEntre } = Comun;

/* ------------------------------- Elementos ------------------------------- */
const gridEquipos = document.getElementById("gridEquipos");
const buscarEquipo = document.getElementById("buscarEquipo");
const filtroCategoria = document.getElementById("filtroCategoria");
const soloDisponibles = document.getElementById("soloDisponibles");

const listaSolicitudes = document.getElementById("listaSolicitudes");
const contadorSolicitudes = document.getElementById("contadorSolicitudes");
const filtroSolicitud = document.getElementById("filtroSolicitud");

const solInicio = document.getElementById("solInicio");
const solFin = document.getElementById("solFin");
const cartVacio = document.getElementById("cartVacio");
const cartContenedor = document.getElementById("cartContenedor");
const tablaCarrito = document.getElementById("tablaCarrito");
const avisoSolicitud = document.getElementById("avisoSolicitud");
const btnEnviar = document.getElementById("btnEnviarSolicitud");
const spinnerSolicitud = document.getElementById("spinnerSolicitud");

const modalDetalle = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalDetalleSolicitud")
);

/* --------------------------------- Estado --------------------------------- */
const estado = {
  sesion: null,
  equipos: [],
  categorias: [],
  carrito: new Map(), // id_equipo -> { equipo, cantidad }
  solicitudes: [],
};

const ICONOS_CATEGORIA = {
  audio: "bi-music-note-beamed",
  video: "bi-camera-reels",
  iluminacion: "bi-lightbulb",
  "iluminación": "bi-lightbulb",
  computo: "bi-pc-display",
  "cómputo": "bi-pc-display",
  escenario: "bi-buildings",
  accesorios: "bi-tools",
};

function iconoCategoria(nombre) {
  const clave = String(nombre || "").toLowerCase();
  for (const [llave, icono] of Object.entries(ICONOS_CATEGORIA)) {
    if (clave.includes(llave)) return icono;
  }
  return "bi-camera-reels";
}

/* ------------------------------- Pestañas ------------------------------- */
function activarTab(nombre, { actualizarHash = true } = {}) {
  const paneles = {
    catalogo: document.getElementById("panelCatalogo"),
    nueva: document.getElementById("panelNueva"),
    mis: document.getElementById("panelMis"),
  };

  for (const [clave, panel] of Object.entries(paneles)) {
    panel?.classList.toggle("d-none", clave !== nombre);
  }

  document.querySelectorAll("#tabsPortal [data-tab]").forEach((boton) => {
    boton.classList.toggle("active", boton.dataset.tab === nombre);
  });

  if (actualizarHash) {
    const hash = nombre === "mis" ? "#mis-solicitudes" : "";
    history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
  }

  if (nombre === "mis") cargarSolicitudes();
  if (nombre === "catalogo") pintarCatalogo();
}

document.addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-tab]");
  if (!boton) return;
  evento.preventDefault();
  activarTab(boton.dataset.tab);
});

/* -------------------------------- Catálogo -------------------------------- */
async function cargarCatalogo() {
  gridEquipos.innerHTML = `<div class="col-12 text-center text-muted py-5">
      <span class="spinner-border spinner-border-sm me-2"></span>Cargando catálogo…
    </div>`;

  try {
    const [categorias, equipos] = await Promise.all([
      Api.categorias.listar(),
      Api.equipos.listar(),
    ]);

    estado.categorias = categorias;
    estado.equipos = equipos;

    filtroCategoria.innerHTML = ['<option value="">Todas las categorías</option>']
      .concat(categorias.map((c) =>
        `<option value="${c.id_categoria}">${escapar(c.nombre_categoria)}</option>`
      ))
      .join("");

    pintarCatalogo();
  } catch (e) {
    gridEquipos.innerHTML = `<div class="col-12"><div class="alert alert-danger mb-0">
        ${escapar(e.message)}</div></div>`;
    error(e);
  }
}

function equiposFiltrados() {
  const texto = buscarEquipo.value.trim().toLowerCase();
  const idCategoria = Number(filtroCategoria.value) || null;
  const soloLibres = soloDisponibles.checked;

  return estado.equipos.filter((e) => {
    if (idCategoria && e.id_categoria !== idCategoria) return false;
    if (soloLibres && Number(e.disponible) <= 0) return false;
    if (!texto) return true;
    return `${e.nombre} ${e.marca ?? ""} ${e.nombre_categoria}`
      .toLowerCase()
      .includes(texto);
  });
}

function pintarCatalogo() {
  const equipos = equiposFiltrados();

  if (!equipos.length) {
    gridEquipos.innerHTML = `<div class="col-12 text-center text-muted py-5">
        <i class="bi bi-inbox fs-2 d-block mb-2"></i>
        No hay equipos que coincidan con tu búsqueda.
      </div>`;
    return;
  }

  gridEquipos.innerHTML = equipos.map((e) => {
    const disponible = Number(e.disponible);
    const enCarrito = estado.carrito.get(e.id_equipo)?.cantidad ?? 0;
    const puedeAgregar = disponible > 0 && enCarrito < disponible;

    return `
      <div class="col-md-6 col-xl-4">
        <article class="equipo-card p-3 d-flex flex-column">
          <div class="d-flex align-items-start gap-3 mb-3">
            <div class="icono-categoria"><i class="bi ${iconoCategoria(e.nombre_categoria)}"></i></div>
            <div class="flex-grow-1">
              <div class="fw-semibold">${escapar(e.nombre)}</div>
              <div class="celda-secundaria">${escapar(e.marca) || "Sin marca"} · ${escapar(e.nombre_categoria)}</div>
            </div>
            <span class="badge ${disponible > 0 ? "text-bg-success" : "text-bg-secondary"}">
              ${disponible > 0 ? `${disponible} disp.` : "Agotado"}
            </span>
          </div>

          <div class="d-flex align-items-end justify-content-between mt-auto">
            <div class="precio">
              ${dinero(e.precio_renta_diario)} <small>/ día</small>
            </div>
            <button class="btn btn-sm ${puedeAgregar ? "btn-primary" : "btn-outline-secondary"}"
                    data-agregar="${e.id_equipo}" ${puedeAgregar ? "" : "disabled"}>
              <i class="bi bi-cart-plus me-1"></i>
              ${enCarrito ? `En solicitud (${enCarrito})` : "Agregar"}
            </button>
          </div>
        </article>
      </div>`;
  }).join("");
}

gridEquipos.addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-agregar]");
  if (!boton) return;

  const equipo = estado.equipos.find((e) => e.id_equipo === Number(boton.dataset.agregar));
  if (!equipo) return;

  const actual = estado.carrito.get(equipo.id_equipo);
  const cantidad = (actual?.cantidad ?? 0) + 1;

  if (cantidad > Number(equipo.disponible)) {
    toast(`Solo hay ${equipo.disponible} unidades disponibles de "${equipo.nombre}"`, "warning");
    return;
  }

  estado.carrito.set(equipo.id_equipo, { equipo, cantidad });
  avisoSolicitud.classList.add("d-none");
  pintarCarrito();
  pintarCatalogo();
  toast(`"${equipo.nombre}" agregado a tu solicitud`, "info");
});

buscarEquipo.addEventListener("input", Comun.debounce(pintarCatalogo, 200));
filtroCategoria.addEventListener("change", pintarCatalogo);
soloDisponibles.addEventListener("change", pintarCatalogo);

/* --------------------------------- Carrito --------------------------------- */
function diasActuales() {
  if (!solInicio.value || !solFin.value) return 1;
  return diasEntre(solInicio.value, solFin.value);
}

function actualizarResumenCarrito() {
  const dias = diasActuales();
  const lineas = estado.carrito.size;
  const unidades = [...estado.carrito.values()].reduce((s, i) => s + i.cantidad, 0);
  const total = [...estado.carrito.values()].reduce(
    (s, i) => s + Number(i.equipo.precio_renta_diario) * i.cantidad * dias,
    0
  );

  document.getElementById("cartDias").textContent = dias;
  document.getElementById("cartLineas").textContent = lineas;
  document.getElementById("cartUnidades").textContent = unidades;
  document.getElementById("cartTotal").textContent = dinero(total);

  const badge = document.getElementById("cartCount");
  badge.textContent = lineas;
  badge.classList.toggle("d-none", lineas === 0);

  const botonTab = document.querySelector('[data-tab="nueva"]');
  botonTab?.classList.toggle("text-primary", lineas > 0);
}

function pintarCarrito() {
  const hay = estado.carrito.size > 0;
  cartVacio.classList.toggle("d-none", hay);
  cartContenedor.classList.toggle("d-none", !hay);

  const dias = diasActuales();

  tablaCarrito.innerHTML = [...estado.carrito.values()].map(({ equipo, cantidad }) => {
    const subtotal = Number(equipo.precio_renta_diario) * cantidad * dias;
    return `
      <tr>
        <td>
          <div class="celda-principal">${escapar(equipo.nombre)}</div>
          <div class="celda-secundaria">${escapar(equipo.marca) || "Sin marca"}</div>
        </td>
        <td class="text-end">${dinero(equipo.precio_renta_diario)}</td>
        <td>
          <input type="number" class="form-control form-control-sm text-center"
                 data-cantidad="${equipo.id_equipo}" min="1" max="${equipo.disponible}"
                 value="${cantidad}" aria-label="Cantidad de ${escapar(equipo.nombre)}" />
        </td>
        <td class="text-end" data-subtotal="${equipo.id_equipo}">${dinero(subtotal)}</td>
        <td class="text-end">
          <button type="button" class="btn btn-sm btn-outline-danger"
                  data-quitar="${equipo.id_equipo}" aria-label="Quitar ${escapar(equipo.nombre)}">
            <i class="bi bi-x-lg"></i>
          </button>
        </td>
      </tr>`;
  }).join("");

  actualizarResumenCarrito();
}

tablaCarrito.addEventListener("input", (evento) => {
  const input = evento.target.closest("input[data-cantidad]");
  if (!input) return;

  const id = Number(input.dataset.cantidad);
  const item = estado.carrito.get(id);
  if (!item) return;

  let cantidad = Math.floor(Number(input.value));
  if (!Number.isFinite(cantidad) || cantidad < 1) cantidad = 1;
  if (cantidad > Number(item.equipo.disponible)) {
    cantidad = Number(item.equipo.disponible);
    toast(`Máximo ${item.equipo.disponible} unidades de "${item.equipo.nombre}"`, "warning");
  }

  item.cantidad = cantidad;
  input.value = cantidad;

  const celda = tablaCarrito.querySelector(`[data-subtotal="${id}"]`);
  if (celda) {
    celda.textContent = dinero(
      Number(item.equipo.precio_renta_diario) * cantidad * diasActuales()
    );
  }
  // No re-renderizamos la tabla aquí: el usuario está escribiendo en ella.
  actualizarResumenCarrito();
  pintarCatalogo();
});

tablaCarrito.addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-quitar]");
  if (!boton) return;

  estado.carrito.delete(Number(boton.dataset.quitar));
  pintarCarrito();
  pintarCatalogo();
});

/* ---------------------------------- Fechas ---------------------------------- */
function ajustarFechas() {
  if (!solInicio.value) return;

  solFin.min = solInicio.value;
  if (!solFin.value || solFin.value < solInicio.value) {
    solFin.value = solInicio.value;
  }
  pintarCarrito();
}

solInicio.addEventListener("change", ajustarFechas);
solFin.addEventListener("change", ajustarFechas);

/* ------------------------------ Enviar solicitud ------------------------------ */
btnEnviar.addEventListener("click", async () => {
  avisoSolicitud.classList.add("d-none");

  if (!solInicio.value || !solFin.value) {
    avisoSolicitud.textContent = "Selecciona las fechas de la renta.";
    avisoSolicitud.classList.remove("d-none");
    return;
  }
  if (solFin.value < solInicio.value) {
    avisoSolicitud.textContent = "La fecha fin no puede ser anterior al inicio.";
    avisoSolicitud.classList.remove("d-none");
    return;
  }
  if (!estado.carrito.size) {
    avisoSolicitud.textContent = "Agrega al menos un equipo desde el catálogo.";
    avisoSolicitud.classList.remove("d-none");
    return;
  }

  const payload = {
    // El backend ignora este campo para clientes y usa el de la sesión.
    id_cliente: estado.sesion?.id_cliente ?? 0,
    fecha_inicio: solInicio.value,
    fecha_fin_estimada: solFin.value,
    estado: "Solicitada",
    detalles: [...estado.carrito.values()].map(({ equipo, cantidad }) => ({
      id_equipo: equipo.id_equipo,
      cantidad,
    })),
  };

  btnEnviar.disabled = true;
  spinnerSolicitud.classList.remove("d-none");

  try {
    const creada = await Api.rentas.crear(payload);
    estado.carrito.clear();
    pintarCarrito();
    pintarCatalogo();
    toast(`Solicitud #${creada.id_renta} enviada. El administrador la revisará.`);
    activarTab("mis");
    await cargarSolicitudes();
  } catch (e) {
    avisoSolicitud.textContent = e.message;
    avisoSolicitud.classList.remove("d-none");
    error(e);
  } finally {
    btnEnviar.disabled = false;
    spinnerSolicitud.classList.add("d-none");
  }
});

/* ------------------------------ Mis solicitudes ------------------------------ */
async function cargarSolicitudes() {
  listaSolicitudes.innerHTML = `<div class="col-12 text-center text-muted py-5">
      <span class="spinner-border spinner-border-sm me-2"></span>Cargando solicitudes…
    </div>`;

  try {
    estado.solicitudes = await Api.rentas.listar({ estado: filtroSolicitud.value });
    pintarSolicitudes();
    actualizarMetricas();
  } catch (e) {
    listaSolicitudes.innerHTML = `<div class="col-12"><div class="alert alert-danger mb-0">
        ${escapar(e.message)}</div></div>`;
    error(e);
  }
}

function pintarSolicitudes() {
  contadorSolicitudes.textContent =
    `${estado.solicitudes.length} solicitud${estado.solicitudes.length === 1 ? "" : "es"}`;

  if (!estado.solicitudes.length) {
    listaSolicitudes.innerHTML = `<div class="col-12 text-center text-muted py-5">
        <i class="bi bi-inbox fs-2 d-block mb-2"></i>
        Todavía no tienes solicitudes. Arma la primera desde el catálogo.
      </div>`;
    return;
  }

  listaSolicitudes.innerHTML = estado.solicitudes.map((r) => {
    const cancelable = r.estado === "Solicitada";
    const resumenEquipos = Number(r.lineas_pendientes) > 0
      ? `${r.lineas_pendientes} línea(s) sin devolver`
      : "Sin líneas pendientes";

    return `
      <div class="col-lg-6">
        <article class="tarjeta-solicitud p-3 h-100 d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div>
              <div class="fw-bold">Solicitud #${r.id_renta}</div>
              <div class="celda-secundaria">Creada el ${fechaHora(r.fecha_registro)}</div>
            </div>
            ${badgeEstado(r.estado)}
          </div>

          <div class="row g-2 small mb-3">
            <div class="col-6">
              <div class="text-muted">Periodo</div>
              <div>${fecha(r.fecha_inicio)} → ${fecha(r.fecha_fin_estimada)}</div>
            </div>
            <div class="col-6">
              <div class="text-muted">Total</div>
              <div class="fw-semibold">${dinero(r.monto_total)}</div>
            </div>
            <div class="col-6">
              <div class="text-muted">Pagado</div>
              <div class="${Number(r.pagado) > 0 ? "text-success" : "text-muted"}">${dinero(r.pagado)}</div>
            </div>
            <div class="col-6">
              <div class="text-muted">Equipos</div>
              <div>${escapar(resumenEquipos)}</div>
            </div>
          </div>

          ${r.motivo_rechazo
            ? `<div class="alert alert-warning py-2 px-3 small mb-3">
                 <i class="bi bi-info-circle me-1"></i>${escapar(r.motivo_rechazo)}
               </div>`
            : ""}

          <div class="d-flex gap-2 mt-auto">
            <button class="btn btn-sm btn-outline-primary" data-detalle="${r.id_renta}">
              <i class="bi bi-eye me-1"></i>Detalle
            </button>
            ${cancelable
              ? `<button class="btn btn-sm btn-outline-danger" data-cancelar="${r.id_renta}">
                   <i class="bi bi-x-circle me-1"></i>Cancelar
                 </button>`
              : ""}
          </div>
        </article>
      </div>`;
  }).join("");
}

function actualizarMetricas() {
  const todas = estado.solicitudes;
  const pendientes = todas.filter((r) => r.estado === "Solicitada").length;
  const activas = todas.filter((r) => r.estado === "Activa").length;
  const total = todas
    .filter((r) => r.estado !== "Cancelada")
    .reduce((s, r) => s + Number(r.monto_total), 0);

  document.getElementById("metricPendientes").textContent = pendientes;
  document.getElementById("metricActivas").textContent = activas;
  document.getElementById("metricTotal").textContent = dinero(total);
}

listaSolicitudes.addEventListener("click", async (evento) => {
  const detalle = evento.target.closest("[data-detalle]");
  if (detalle) {
    abrirDetalle(Number(detalle.dataset.detalle));
    return;
  }

  const cancelar = evento.target.closest("[data-cancelar]");
  if (!cancelar) return;

  const id = Number(cancelar.dataset.cancelar);
  const ok = await confirmar({
    titulo: "Cancelar solicitud",
    texto: `La solicitud <strong>#${id}</strong> quedará cancelada y ya no podrá aprobarse.
            Puedes volver a solicitarla cuando quieras.`,
    boton: "Cancelar solicitud",
    peligro: true,
  });
  if (!ok) return;

  try {
    await Api.rentas.cancelar(id);
    toast("Solicitud cancelada");
    await cargarSolicitudes();
  } catch (e) {
    error(e);
  }
});

filtroSolicitud.addEventListener("change", cargarSolicitudes);
document.getElementById("btnRecargarSolicitudes").addEventListener("click", () => {
  cargarSolicitudes();
});

/* ------------------------------ Modal detalle ------------------------------ */
async function abrirDetalle(id) {
  modalDetalle.show();
  const cuerpo = document.getElementById("detalleSolicitud");
  document.getElementById("tituloDetalleSolicitud").textContent = `Solicitud #${id}`;
  cuerpo.innerHTML = `<div class="text-center text-muted py-4">
      <span class="spinner-border spinner-border-sm me-2"></span>Cargando…
    </div>`;

  try {
    const r = await Api.rentas.obtener(id);
    pintarDetalle(r);
  } catch (e) {
    cuerpo.innerHTML = `<div class="alert alert-danger mb-0">${escapar(e.message)}</div>`;
    error(e);
  }
}

function pintarDetalle(r) {
  const cuerpo = document.getElementById("detalleSolicitud");
  const aprobada = r.fecha_aprobacion
    ? `<li>
         <span class="punto"><i class="bi bi-check-lg"></i></span>
         <div>
           <div class="fw-semibold">${r.estado === "Cancelada" ? "Revisada" : "Aprobada"}</div>
           <div class="celda-secundaria">
             ${fechaHora(r.fecha_aprobacion)}${r.aprobador ? ` · ${escapar(r.aprobador)}` : ""}
           </div>
         </div>
       </li>`
    : "";

  cuerpo.innerHTML = `
    <div class="d-flex justify-content-between align-items-start mb-3">
      <div>
        <h4 class="mb-1">Solicitud #${r.id_renta}</h4>
        <div class="text-muted small">${fechaHora(r.fecha_registro)}</div>
      </div>
      ${badgeEstado(r.estado)}
    </div>

    ${r.motivo_rechazo
      ? `<div class="alert alert-warning">
           <strong>Nota del administrador:</strong> ${escapar(r.motivo_rechazo)}
         </div>`
      : ""}

    <div class="row g-3 mb-3">
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
          <div class="text-muted small">Saldo</div>
          <div class="fw-semibold ${Number(r.pagado) >= Number(r.monto_total) ? "text-success" : "text-danger"}">
            ${dinero(Number(r.monto_total) - Number(r.pagado))}
          </div>
        </div>
      </div>
    </div>

    <h6 class="text-uppercase text-muted small fw-bold">Equipos</h6>
    <div class="table-responsive mb-4">
      <table class="table align-middle tabla-datos mb-0">
        <thead>
          <tr>
            <th>Equipo</th>
            <th class="text-center">Cant.</th>
            <th class="text-end">Precio/día</th>
            <th class="text-end">Subtotal</th>
            <th>Devolución</th>
          </tr>
        </thead>
        <tbody>
          ${r.detalles.map((d) => `
            <tr>
              <td>
                <div class="celda-principal">${escapar(d.equipo)}</div>
                <div class="celda-secundaria">${escapar(d.marca) || "Sin marca"}</div>
              </td>
              <td class="text-center">${d.cantidad}</td>
              <td class="text-end">${dinero(d.precio_unitario)}</td>
              <td class="text-end">${dinero(d.subtotal)}</td>
              <td>${d.fecha_devolucion
                ? `<span class="text-success small">${fecha(d.fecha_devolucion)}</span>`
                : '<span class="badge text-bg-warning">Pendiente</span>'}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <h6 class="text-uppercase text-muted small fw-bold">Seguimiento</h6>
    <ul class="timeline mt-2 mb-0">
      <li>
        <span class="punto"><i class="bi bi-send"></i></span>
        <div>
          <div class="fw-semibold">Solicitud enviada</div>
          <div class="celda-secundaria">${fechaHora(r.fecha_registro)}</div>
        </div>
      </li>
      ${aprobada}
      ${r.estado === "Finalizada"
        ? `<li>
             <span class="punto"><i class="bi bi-box-arrow-in-down"></i></span>
             <div>
               <div class="fw-semibold">Renta finalizada</div>
               <div class="celda-secundaria">Todos los equipos fueron devueltos</div>
             </div>
           </li>`
        : ""}
    </ul>`;
}

/* --------------------------------- Arranque --------------------------------- */
Comun.listo.then((sesion) => {
  if (!sesion) return; // comun.js ya está redirigiendo

  estado.sesion = sesion;
  document.getElementById("saludoCliente").textContent = sesion.nombre || "cliente";

  const hoy = hoyISO();
  solInicio.min = hoy;
  solInicio.value = hoy;
  solFin.min = hoy;
  solFin.value = sumarDias(hoy, 1);

  pintarCarrito();

  if (location.hash === "#mis-solicitudes") {
    activarTab("mis", { actualizarHash: false });
  } else {
    activarTab("catalogo", { actualizarHash: false });
  }

  cargarCatalogo();
  cargarSolicitudes();
});
