/* =====================================================================
   Pantalla: Rentas (proceso central)
   ---------------------------------------------------------------------
   Cubre el flujo completo:
     crear renta -> ver detalle -> registrar pago -> devolver -> estado
   Toda la validación real la hace el backend; aquí solo se evita que el
   usuario mande algo evidentemente inválido.
   ===================================================================== */

const { dinero, fecha, fechaHora, badgeEstado, escapar, toast, error, confirmar,
        filaCargando, filaVacia, hoyISO, sumarDias, diasEntre, llenarSelect } = Comun;

/* ------------------------------- Elementos ------------------------------- */
const tablaRentas = document.getElementById("tablaRentas");
const contadorRentas = document.getElementById("contadorRentas");
const filtroEstado = document.getElementById("filtroEstado");
const filtroCliente = document.getElementById("filtroCliente");

const formRenta = document.getElementById("formRenta");
const btnCrearRenta = document.getElementById("btnCrearRenta");
const rentaCliente = document.getElementById("rentaCliente");
const rentaInicio = document.getElementById("rentaInicio");
const rentaFin = document.getElementById("rentaFin");
const rentaEstado = document.getElementById("rentaEstado");
const equipoSelect = document.getElementById("equipoSelect");
const equipoCantidad = document.getElementById("equipoCantidad");
const carritoVacio = document.getElementById("carritoVacio");
const carritoContenedor = document.getElementById("carritoContenedor");
const tablaCarrito = document.getElementById("carrito");
const avisoCarrito = document.getElementById("avisoCarrito");

const detalleContenido = document.getElementById("detalleContenido");

const formPago = document.getElementById("formPago");
const btnGuardarPago = document.getElementById("btnGuardarPago");
const pagoMonto = document.getElementById("pagoMonto");

const modalNueva = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalNuevaRenta"));
const modalPago = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPago"));
const offcanvasDetalle = bootstrap.Offcanvas.getOrCreateInstance(document.getElementById("offcanvasDetalle"));

/* --------------------------------- Estado --------------------------------- */
let rentas = [];
let carrito = [];
let equiposDisponibles = new Map();
let detalleActual = null;
let numeroPeticion = 0;

const saldoDe = (renta) =>
  Math.round((Number(renta.monto_total) - Number(renta.pagado)) * 100) / 100;

/* ============================== LISTADO ============================== */
async function cargar() {
  const miPeticion = ++numeroPeticion;
  tablaRentas.innerHTML = filaCargando(9);

  try {
    const datos = await Api.rentas.listar({
      estado: filtroEstado.value,
      id_cliente: filtroCliente.value,
    });
    if (miPeticion !== numeroPeticion) return;

    rentas = datos;
    pintarListado();
  } catch (e) {
    if (miPeticion !== numeroPeticion) return;
    tablaRentas.innerHTML = filaVacia(9, "No se pudieron cargar las rentas");
    contadorRentas.textContent = "—";
    error(e);
  }
}

function pintarListado() {
  contadorRentas.textContent = `${rentas.length} renta${rentas.length === 1 ? "" : "s"}`;

  tablaRentas.innerHTML = rentas.map((r) => {
    const saldo = saldoDe(r);
    return `
      <tr class="${r.estado === "Solicitada" ? "fila-pendiente" : ""}">
        <td>
          <a href="#" class="fw-semibold" data-accion="detalle" data-id="${r.id_renta}">#${r.id_renta}</a>
        </td>
        <td>
          <div class="celda-principal">${escapar(r.cliente)}</div>
          <div class="celda-secundaria">${escapar(r.telefono) || "Sin teléfono"}</div>
        </td>
        <td>
          <div>${fecha(r.fecha_inicio)}</div>
          <div class="celda-secundaria">al ${fecha(r.fecha_fin_estimada)}</div>
        </td>
        <td>${badgeEstado(r.estado)}</td>
        <td class="text-end">${dinero(r.monto_total)}</td>
        <td class="text-end">${dinero(r.pagado)}</td>
        <td class="text-end">
          ${saldo <= 0
            ? '<span class="badge text-bg-success">Pagado</span>'
            : `<span class="text-danger fw-semibold">${dinero(saldo)}</span>`}
        </td>
        <td class="text-center">
          ${r.lineas_pendientes > 0
            ? `<span class="badge text-bg-warning">${r.lineas_pendientes}</span>`
            : '<span class="badge text-bg-success">0</span>'}
        </td>
        <td class="text-end acciones-tabla no-print">
          <button class="btn btn-outline-primary" data-accion="detalle" data-id="${r.id_renta}">
            <i class="bi bi-eye me-1"></i>Detalle
          </button>
        </td>
      </tr>`;
  }).join("") || filaVacia(9, "No hay rentas con ese filtro");
}

/* =========================== NUEVA RENTA =========================== */
async function abrirNuevaRenta() {
  formRenta.reset();
  formRenta.classList.remove("was-validated");
  avisoCarrito.classList.add("d-none");

  carrito = [];

  const hoy = hoyISO();
  rentaInicio.value = hoy;
  rentaInicio.min = hoy;
  rentaFin.min = hoy;
  rentaFin.value = sumarDias(hoy, 1);

  await cargarOpciones();
  pintarCarrito();
  modalNueva.show();
}

async function cargarOpciones() {
  try {
    const [clientes, equipos] = await Promise.all([
      Api.clientes.listar("", "true"),
      Api.equipos.listar({ disponibles: true }),
    ]);

    llenarSelect(
      rentaCliente,
      clientes.map((c) => ({ valor: c.id_cliente, texto: c.nombre_completo })),
      { placeholder: "Selecciona un cliente activo…" }
    );

    equiposDisponibles = new Map(equipos.map((e) => [e.id_equipo, e]));

    llenarSelect(
      equipoSelect,
      equipos.map((e) => ({
        valor: e.id_equipo,
        texto: `${e.nombre}${e.marca ? ` (${e.marca})` : ""} — ${e.disponible} disp. — ${dinero(e.precio_renta_diario)}/día`,
      })),
      { placeholder: equipos.length ? "Selecciona un equipo disponible…" : "No hay equipos disponibles" }
    );

    if (!clientes.length) {
      toast("No hay clientes activos. Registra uno antes de rentar.", "warning");
    }
    if (!equipos.length) {
      toast("No hay equipos con unidades disponibles.", "warning");
    }
  } catch (e) {
    error(e);
  }
}

function diasActuales() {
  if (!rentaInicio.value || !rentaFin.value) return 1;
  return diasEntre(rentaInicio.value, rentaFin.value);
}

function pintarCarrito() {
  const hay = carrito.length > 0;
  carritoVacio.classList.toggle("d-none", hay);
  carritoContenedor.classList.toggle("d-none", !hay);

  const dias = diasActuales();

  tablaCarrito.innerHTML = carrito.map((item) => {
    const subtotal = Number(item.precio_renta_diario) * item.cantidad * dias;
    return `
      <tr>
        <td>
          <div class="celda-principal">${escapar(item.nombre)}</div>
          <div class="celda-secundaria">${escapar(item.marca) || "Sin marca"}</div>
        </td>
        <td class="text-end">${dinero(item.precio_renta_diario)}</td>
        <td>
          <input type="number" class="form-control form-control-sm text-center"
                 data-cantidad="${item.id_equipo}" min="1" max="${item.disponible}"
                 value="${item.cantidad}" aria-label="Cantidad de ${escapar(item.nombre)}" />
        </td>
        <td class="text-end" data-subtotal="${item.id_equipo}">${dinero(subtotal)}</td>
        <td class="text-end">
          <button type="button" class="btn btn-sm btn-outline-danger"
                  data-quitar="${item.id_equipo}" aria-label="Quitar ${escapar(item.nombre)}">
            <i class="bi bi-x-lg"></i>
          </button>
        </td>
      </tr>`;
  }).join("");

  actualizarResumen();
}

function actualizarResumen() {
  const dias = diasActuales();
  const unidades = carrito.reduce((suma, i) => suma + i.cantidad, 0);
  const total = carrito.reduce(
    (suma, i) => suma + Number(i.precio_renta_diario) * i.cantidad * dias,
    0
  );

  document.getElementById("resumenDias").textContent = dias;
  document.getElementById("resumenLineas").textContent = carrito.length;
  document.getElementById("resumenUnidades").textContent = unidades;
  document.getElementById("resumenTotal").textContent = dinero(total);
}

function agregarAlCarrito() {
  const equipo = equiposDisponibles.get(Number(equipoSelect.value));
  const cantidad = Math.floor(Number(equipoCantidad.value));

  if (!equipo) {
    toast("Selecciona un equipo de la lista", "warning");
    return;
  }
  if (!Number.isFinite(cantidad) || cantidad < 1) {
    toast("La cantidad debe ser al menos 1", "warning");
    return;
  }

  const existente = carrito.find((i) => i.id_equipo === equipo.id_equipo);
  const yaAgregado = existente ? existente.cantidad : 0;

  if (yaAgregado + cantidad > equipo.disponible) {
    toast(`Solo hay ${equipo.disponible} unidades disponibles de "${equipo.nombre}"`, "warning");
    return;
  }

  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({
      id_equipo: equipo.id_equipo,
      nombre: equipo.nombre,
      marca: equipo.marca,
      precio_renta_diario: equipo.precio_renta_diario,
      disponible: equipo.disponible,
      cantidad,
    });
  }

  avisoCarrito.classList.add("d-none");
  pintarCarrito();

  equipoSelect.value = "";
  equipoCantidad.value = 1;
  equipoCantidad.removeAttribute("max");
}

/* ------------------------- Eventos del carrito ------------------------- */
document.getElementById("btnAgregarEquipo").addEventListener("click", agregarAlCarrito);

equipoSelect.addEventListener("change", () => {
  const equipo = equiposDisponibles.get(Number(equipoSelect.value));
  equipoCantidad.value = 1;
  if (equipo) {
    equipoCantidad.max = equipo.disponible;
  } else {
    equipoCantidad.removeAttribute("max");
  }
});

tablaCarrito.addEventListener("input", (evento) => {
  const input = evento.target.closest("input[data-cantidad]");
  if (!input) return;

  const item = carrito.find((i) => i.id_equipo === Number(input.dataset.cantidad));
  if (!item) return;

  let cantidad = Math.floor(Number(input.value));
  if (!Number.isFinite(cantidad) || cantidad < 1) cantidad = 1;
  if (cantidad > item.disponible) {
    cantidad = item.disponible;
    toast(`Máximo ${item.disponible} unidades de "${item.nombre}"`, "warning");
  }

  item.cantidad = cantidad;
  input.value = cantidad;

  const celda = tablaCarrito.querySelector(`[data-subtotal="${item.id_equipo}"]`);
  if (celda) {
    celda.textContent = dinero(Number(item.precio_renta_diario) * cantidad * diasActuales());
  }
  actualizarResumen();
});

tablaCarrito.addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-quitar]");
  if (!boton) return;

  carrito = carrito.filter((i) => i.id_equipo !== Number(boton.dataset.quitar));
  pintarCarrito();
});

function ajustarFechas() {
  if (!rentaInicio.value) return;

  rentaFin.min = rentaInicio.value;
  if (!rentaFin.value || rentaFin.value < rentaInicio.value) {
    rentaFin.value = rentaInicio.value;
  }
  pintarCarrito(); // recalcula subtotales con los nuevos días
}

rentaInicio.addEventListener("change", ajustarFechas);
rentaFin.addEventListener("change", ajustarFechas);

/* --------------------------- Guardar renta --------------------------- */
formRenta.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!formRenta.checkValidity()) {
    formRenta.classList.add("was-validated");
    return;
  }

  if (!carrito.length) {
    avisoCarrito.textContent = "Agrega al menos un equipo a la renta.";
    avisoCarrito.classList.remove("d-none");
    return;
  }

  if (rentaFin.value < rentaInicio.value) {
    toast("La fecha fin no puede ser anterior al inicio", "warning");
    return;
  }

  const payload = {
    id_cliente: Number(rentaCliente.value),
    fecha_inicio: rentaInicio.value,
    fecha_fin_estimada: rentaFin.value,
    estado: rentaEstado.value,
    detalles: carrito.map((i) => ({ id_equipo: i.id_equipo, cantidad: i.cantidad })),
  };

  btnCrearRenta.disabled = true;
  try {
    const creada = await Api.rentas.crear(payload);
    modalNueva.hide();
    toast(`Renta #${creada.id_renta} creada por ${dinero(creada.monto_total)}`);
    await cargar();
    await abrirDetalle(creada.id_renta);
  } catch (e) {
    // Ej.: "Stock insuficiente de 'Proyector 4K': se pidieron 3 y solo hay 2"
    error(e);
    avisoCarrito.textContent = e.message;
    avisoCarrito.classList.remove("d-none");
  } finally {
    btnCrearRenta.disabled = false;
  }
});

/* ============================== DETALLE ============================== */
async function abrirDetalle(idRenta) {
  offcanvasDetalle.show();
  detalleContenido.innerHTML = `
    <div class="text-center text-muted py-5">
      <span class="spinner-border spinner-border-sm me-2"></span>Cargando…
    </div>`;

  try {
    detalleActual = await Api.rentas.obtener(idRenta);
    pintarDetalle();
  } catch (e) {
    detalleContenido.innerHTML = `<div class="alert alert-danger">${escapar(e.message)}</div>`;
    error(e);
  }
}

function pintarDetalle() {
  const r = detalleActual;
  const saldo = saldoDe(r);
  const pendientes = r.detalles.filter((d) => !d.fecha_devolucion);
  const pagadoCompleto = saldo <= 0;

  // Una solicitud todavía no es una renta: no se cobra ni se devuelve nada.
  const esSolicitud = r.estado === "Solicitada";
  const cerrada = r.estado === "Cancelada";
  const puedeCobrar = !esSolicitud && !cerrada && !pagadoCompleto;
  const puedeDevolver = !esSolicitud && !cerrada && pendientes.length > 0;

  const filasDetalle = r.detalles.map((d) => {
    const pendiente = !d.fecha_devolucion;
    return `
      <tr>
        <td class="text-center">
          ${pendiente
            ? `<input class="form-check-input check-detalle" type="checkbox" value="${d.id_detalle}"
                      aria-label="Seleccionar ${escapar(d.equipo)}">`
            : '<i class="bi bi-check2 text-success"></i>'}
        </td>
        <td>
          <div class="celda-principal">${escapar(d.equipo)}</div>
          <div class="celda-secundaria">${escapar(d.marca) || "Sin marca"}</div>
        </td>
        <td class="text-center">${d.cantidad}</td>
        <td class="text-end">${dinero(d.precio_unitario)}</td>
        <td class="text-end">${dinero(d.subtotal)}</td>
        <td>
          ${pendiente
            ? '<span class="badge text-bg-warning">Pendiente</span>'
            : `<span class="text-success small">${fecha(d.fecha_devolucion)}</span>`}
        </td>
      </tr>`;
  }).join("");

  const filasPagos = r.pagos.map((p) => `
    <tr>
      <td>${fechaHora(p.fecha_pago)}</td>
      <td>${escapar(p.metodo_pago)}</td>
      <td class="text-end">${dinero(p.monto_pagado)}</td>
    </tr>`).join("");

  const opcionesEstado = ["Reservada", "Activa", "Finalizada", "Cancelada"]
    .map((e) => `<option value="${e}" ${e === r.estado ? "selected" : ""}>${e}</option>`)
    .join("");

  const avisoSolicitud = esSolicitud
    ? `<div class="alert alert-warning">
         <div class="fw-semibold mb-1"><i class="bi bi-hourglass-split me-1"></i>Solicitud pendiente de aprobación</div>
         <p class="small mb-2">
           Todavía no aparta inventario. Al aprobar, el servidor revalida la disponibilidad
           antes de reservar o entregar los equipos.
         </p>
         <div class="d-flex flex-wrap gap-2">
           <button class="btn btn-sm btn-outline-primary" data-accion="aprobar" data-estado="Reservada">
             <i class="bi bi-bookmark-check me-1"></i>Aprobar y reservar
           </button>
           <button class="btn btn-sm btn-success" data-accion="aprobar" data-estado="Activa">
             <i class="bi bi-check2-circle me-1"></i>Aprobar y entregar
           </button>
           <a class="btn btn-sm btn-outline-danger" href="solicitudes.html">
             <i class="bi bi-x-circle me-1"></i>Rechazar en la bandeja
           </a>
         </div>
       </div>`
    : "";

  const avisoCierre = cerrada && r.motivo_rechazo
    ? `<div class="alert alert-secondary">
         <strong>Motivo:</strong> ${escapar(r.motivo_rechazo)}
       </div>`
    : "";

  const seguimientoAprobacion = r.fecha_aprobacion
    ? `<div class="small text-muted mt-2">
         ${esSolicitud ? "" : "Aprobada"} ${fechaHora(r.fecha_aprobacion)}
         ${r.aprobador ? ` por ${escapar(r.aprobador)}` : ""}
       </div>`
    : "";

  const zonaEstado = esSolicitud
    ? `<div class="alert alert-light border mb-0 small">
         <i class="bi bi-info-circle me-1"></i>
         Esta renta nació como solicitud. Para moverla a <strong>Reservada</strong> o
         <strong>Activa</strong> usa los botones de aprobación de arriba; el cambio
         genérico de estado no revalida el inventario.
       </div>`
    : `<label class="form-label" for="detalleEstado">Cambiar estado</label>
       <div class="input-group mb-3">
         <select class="form-select" id="detalleEstado">${opcionesEstado}</select>
         <button class="btn btn-outline-primary" data-accion="cambiar-estado">Aplicar</button>
       </div>`;

  detalleContenido.innerHTML = `
    <div class="d-flex justify-content-between align-items-start mb-3">
      <div>
        <h4 class="mb-1">Renta #${r.id_renta}</h4>
        <div class="text-muted">${escapar(r.cliente)} · ${escapar(r.telefono) || "sin teléfono"}</div>
      </div>
      ${badgeEstado(r.estado)}
    </div>

    ${avisoSolicitud}
    ${avisoCierre}

    <dl class="row dato-detalle mb-2">
      <div class="col-6">
        <dt>Registrada</dt>
        <dd>${fechaHora(r.fecha_registro)}</dd>
      </div>
      <div class="col-6">
        <dt>Periodo</dt>
        <dd>${fecha(r.fecha_inicio)} → ${fecha(r.fecha_fin_estimada)}</dd>
      </div>
      <div class="col-4">
        <dt>Total</dt>
        <dd class="fw-semibold">${dinero(r.monto_total)}</dd>
      </div>
      <div class="col-4">
        <dt>Pagado</dt>
        <dd class="text-success">${dinero(r.pagado)}</dd>
      </div>
      <div class="col-4">
        <dt>Saldo</dt>
        <dd class="${pagadoCompleto ? "text-success" : "text-danger"} fw-semibold">${dinero(saldo)}</dd>
      </div>
    </dl>
    ${seguimientoAprobacion}

    <h6 class="text-uppercase text-muted small fw-bold mt-4">Equipos</h6>
    <div class="table-responsive">
      <table class="table align-middle tabla-datos">
        <thead>
          <tr>
            <th></th>
            <th>Equipo</th>
            <th class="text-center">Cant.</th>
            <th class="text-end">Precio/día</th>
            <th class="text-end">Subtotal</th>
            <th>Devolución</th>
          </tr>
        </thead>
        <tbody>${filasDetalle}</tbody>
      </table>
    </div>

    <h6 class="text-uppercase text-muted small fw-bold mt-4">Pagos</h6>
    ${r.pagos.length
      ? `<div class="table-responsive">
           <table class="table align-middle tabla-datos">
             <thead><tr><th>Fecha</th><th>Método</th><th class="text-end">Monto</th></tr></thead>
             <tbody>${filasPagos}</tbody>
           </table>
         </div>`
      : '<p class="text-muted small">Todavía no se ha registrado ningún pago.</p>'}

    <div class="d-flex flex-wrap gap-2 mt-4">
      <button class="btn btn-success" data-accion="pagar" ${puedeCobrar ? "" : "disabled"}>
        <i class="bi bi-cash-coin me-1"></i>Registrar pago
      </button>
      <button class="btn btn-outline-primary" data-accion="devolver-seleccion"
              ${puedeDevolver ? "" : "disabled"}>
        <i class="bi bi-check2-square me-1"></i>Devolver seleccionados
      </button>
      <button class="btn btn-outline-secondary" data-accion="devolver-todo"
              ${puedeDevolver ? "" : "disabled"}>
        <i class="bi bi-box-arrow-in-down me-1"></i>Devolver todo
      </button>
    </div>
    ${esSolicitud
      ? `<p class="text-muted small mt-2 mb-0">
           Los pagos y las devoluciones se habilitan cuando la solicitud se aprueba.
         </p>`
      : pendientes.length
        ? `<p class="text-muted small mt-2 mb-0">
             Marca las casillas para devolver solo algunas líneas, o usa “Devolver todo”.
             Al no quedar pendientes, la renta pasa a <strong>Finalizada</strong> automáticamente.
           </p>`
        : ""}

    <hr class="my-4" />

    <div class="card border">
      <div class="card-body">
        ${zonaEstado}
        <button class="btn btn-outline-danger w-100" data-accion="eliminar">
          <i class="bi bi-trash me-1"></i>Eliminar renta
        </button>
      </div>
    </div>`;
}

detalleContenido.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton || !detalleActual) return;

  const idRenta = detalleActual.id_renta;

  try {
    /* --------------------------- Aprobar solicitud --------------------------- */
    if (boton.dataset.accion === "aprobar") {
      const nuevoEstado = boton.dataset.estado || "Reservada";
      const ok = await confirmar({
        titulo: `Aprobar la solicitud #${idRenta}`,
        texto: `La renta pasará a <strong>${nuevoEstado}</strong>.
                El servidor revalidará la disponibilidad antes de apartar el inventario.`,
        boton: "Aprobar",
      });
      if (!ok) return;

      await Api.rentas.aprobar(idRenta, nuevoEstado);
      toast(`Solicitud #${idRenta} aprobada como ${nuevoEstado}`);
      Comun.actualizarBadge();
      await cargar();
      await abrirDetalle(idRenta);
      return;
    }

    /* ------------------------------ Pago ------------------------------ */
    if (boton.dataset.accion === "pagar") {
      const saldo = saldoDe(detalleActual);
      document.getElementById("pagoRentaId").value = idRenta;
      document.getElementById("pagoSaldoTexto").textContent = dinero(saldo);
      pagoMonto.value = saldo.toFixed(2);
      pagoMonto.max = saldo.toFixed(2);
      formPago.classList.remove("was-validated");
      modalPago.show();
      return;
    }

    /* -------------------------- Devoluciones -------------------------- */
    if (boton.dataset.accion === "devolver-seleccion") {
      const ids = [...detalleContenido.querySelectorAll("input.check-detalle:checked")]
        .map((c) => Number(c.value));

      if (!ids.length) {
        toast("Marca al menos una línea o usa “Devolver todo”", "warning");
        return;
      }

      const ok = await confirmar({
        titulo: "Registrar devolución",
        texto: `Se devolverán <strong>${ids.length}</strong> línea(s) de la renta #${idRenta}.
                La disponibilidad se actualizará automáticamente.`,
        boton: "Devolver",
      });
      if (!ok) return;

      await Api.rentas.devolver(idRenta, { id_detalles: ids });
      toast("Devolución registrada");
      await cargar();
      await abrirDetalle(idRenta);
      return;
    }

    if (boton.dataset.accion === "devolver-todo") {
      const ok = await confirmar({
        titulo: "Devolver todos los equipos",
        texto: `Se registrará la devolución de todas las líneas pendientes de la renta #${idRenta}.`,
        boton: "Devolver todo",
      });
      if (!ok) return;

      await Api.rentas.devolver(idRenta, {});
      toast("Devolución registrada. La renta quedó finalizada si no había más pendientes.");
      await cargar();
      await abrirDetalle(idRenta);
      return;
    }

    /* --------------------------- Cambio de estado --------------------------- */
    if (boton.dataset.accion === "cambiar-estado") {
      const estado = document.getElementById("detalleEstado").value;
      if (estado === detalleActual.estado) {
        toast("La renta ya tiene ese estado", "info");
        return;
      }
      await Api.rentas.cambiarEstado(idRenta, estado);
      toast(`Estado actualizado a ${estado}`);
      await cargar();
      await abrirDetalle(idRenta);
      return;
    }

    /* ------------------------------ Eliminar ------------------------------ */
    if (boton.dataset.accion === "eliminar") {
      const ok = await confirmar({
        titulo: "Eliminar renta",
        texto: `Se eliminará la renta <strong>#${idRenta}</strong> junto con sus detalles y pagos.
                <br><br>Si solo quieres anularla conservando el historial, cámbiala a
                <strong>Cancelada</strong> en lugar de borrarla.`,
        boton: "Eliminar",
        peligro: true,
      });
      if (!ok) return;

      await Api.rentas.eliminar(idRenta);
      offcanvasDetalle.hide();
      toast("Renta eliminada");
      detalleActual = null;
      await cargar();
    }
  } catch (e) {
    error(e);
  }
});

/* ================================ PAGOS ================================ */
formPago.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!formPago.checkValidity()) {
    formPago.classList.add("was-validated");
    return;
  }

  const idRenta = Number(document.getElementById("pagoRentaId").value);
  const monto = Number(pagoMonto.value);
  const saldo = detalleActual ? saldoDe(detalleActual) : 0;

  if (monto > saldo + 0.001) {
    toast(`El monto supera el saldo pendiente (${dinero(saldo)})`, "warning");
    return;
  }

  btnGuardarPago.disabled = true;
  try {
    await Api.rentas.pagar(idRenta, {
      monto_pagado: monto,
      metodo_pago: document.getElementById("pagoMetodo").value,
    });
    modalPago.hide();
    toast("Pago registrado");
    await cargar();
    await abrirDetalle(idRenta);
  } catch (e) {
    error(e);
  } finally {
    btnGuardarPago.disabled = false;
  }
});

/* ================================ EVENTOS ================================ */
document.getElementById("btnNuevaRenta").addEventListener("click", abrirNuevaRenta);
document.getElementById("btnRecargarRentas").addEventListener("click", () => {
  cargarFiltros();
  cargar();
});

filtroEstado.addEventListener("change", cargar);
filtroCliente.addEventListener("change", cargar);

tablaRentas.addEventListener("click", (evento) => {
  const objetivo = evento.target.closest("[data-accion='detalle']");
  if (!objetivo) return;
  evento.preventDefault();
  abrirDetalle(Number(objetivo.dataset.id));
});

/* ================================= INICIO ================================= */
async function cargarFiltros() {
  try {
    const [estados, clientes] = await Promise.all([
      Api.sistema.estados(),
      Api.clientes.listar(),
    ]);

    llenarSelect(
      filtroEstado,
      estados.map((e) => ({ valor: e.estado, texto: e.estado })),
      { placeholder: "Todos los estados" }
    );
    llenarSelect(
      filtroCliente,
      clientes.map((c) => ({ valor: c.id_cliente, texto: c.nombre_completo })),
      { placeholder: "Todos los clientes" }
    );
  } catch (e) {
    error(e);
  }
}

(async function iniciar() {
  await cargarFiltros();
  await cargar();

  const params = new URLSearchParams(location.search);
  if (params.get("nueva") === "1") {
    abrirNuevaRenta();
  } else if (params.get("detalle")) {
    const id = Number(params.get("detalle"));
    if (Number.isFinite(id)) abrirDetalle(id);
  }
})();
