/* =====================================================================
   Pantalla: panel general
   Consume /api/salud, /api/reportes/resumen, /api/equipos, /api/rentas
   y /api/reportes/rentas-vencidas.
   ===================================================================== */

const { dinero, fecha, badgeEstado, escapar, filaCargando, filaVacia } = Comun;

const aviso = document.getElementById("avisoConexion");
const btnRecargar = document.getElementById("btnRecargar");

async function cargarPanel() {
  btnRecargar.disabled = true;
  aviso.className = "alert alert-secondary d-flex align-items-center gap-2";
  aviso.innerHTML = `<span class="spinner-border spinner-border-sm"></span>
                     <span>Conectando con la base de datos…</span>`;

  document.getElementById("tablaRentas").innerHTML = filaCargando(5);
  document.getElementById("tablaEquipos").innerHTML = filaCargando(3);
  document.getElementById("feedInicio").innerHTML = `<div class="text-center text-muted py-4">
      <span class="spinner-border spinner-border-sm me-2"></span>Cargando actividad…
    </div>`;

  try {
    const salud = await Api.sistema.salud();

    aviso.className = "alert alert-success d-flex align-items-center gap-2";
    aviso.innerHTML = `<i class="bi bi-check-circle-fill"></i>
      <span>Conectado a <strong>${escapar(salud.base)}</strong> — ${escapar(salud.version.split(",")[0])}</span>`;

    const [resumen, equipos, rentas, vencidas, pendientes, actividad] = await Promise.all([
      Api.reportes.resumen(),
      Api.equipos.listar(),
      Api.rentas.listar(),
      Api.reportes.rentasVencidas(),
      Api.rentas.pendientesConteo(),
      Api.auditoria.listar({ limite: 6 }),
    ]);

    document.getElementById("mClientes").textContent = resumen.clientes_activos;
    document.getElementById("mSolicitudes").textContent = pendientes.pendientes;
    document.getElementById("mRentas").textContent = resumen.rentas_activas;
    document.getElementById("mPendientes").textContent = resumen.lineas_pendientes;
    document.getElementById("mIngresos").textContent = dinero(resumen.ingresos_cobrados);
    document.getElementById("mVencidas").textContent = vencidas.length;
    document.getElementById("mAgotados").textContent = resumen.equipos_agotados;
    document.getElementById("mMontoRentado").textContent = dinero(resumen.monto_rentado);

    /* ------------------------- Últimas 5 rentas ------------------------- */
    const tbodyRentas = document.getElementById("tablaRentas");
    tbodyRentas.innerHTML = rentas.slice(0, 5).map((r) => `
      <tr>
        <td>
          <a class="fw-semibold" href="rentas.html?detalle=${r.id_renta}">#${r.id_renta}</a>
        </td>
        <td>${escapar(r.cliente)}</td>
        <td>${fecha(r.fecha_fin_estimada)}</td>
        <td>${badgeEstado(r.estado)}</td>
        <td class="text-end">${dinero(r.monto_total)}</td>
      </tr>`).join("") || filaVacia(5, "Todavía no hay rentas registradas");

    /* --------------------------- Disponibilidad --------------------------- */
    const tbodyEquipos = document.getElementById("tablaEquipos");
    tbodyEquipos.innerHTML = equipos.map((e) => `
      <tr>
        <td>
          <div class="celda-principal">${escapar(e.nombre)}</div>
          <div class="celda-secundaria">${escapar(e.nombre_categoria)}</div>
        </td>
        <td class="text-center">${e.stock}</td>
        <td class="text-center">
          <span class="badge ${e.disponible > 0 ? "text-bg-success" : "text-bg-danger"} badge-estado">
            ${e.disponible}
          </span>
        </td>
      </tr>`).join("") || filaVacia(3, "Sin equipos registrados");

    /* --------------------------- Actividad reciente --------------------------- */
    pintarActividad(actividad.resultados);

  } catch (e) {
    aviso.className = "alert alert-danger d-flex align-items-center gap-2";
    aviso.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i>
                       <span>${escapar(e.message)}</span>`;
    document.getElementById("tablaRentas").innerHTML = filaVacia(5, "No se pudieron cargar los datos");
    document.getElementById("tablaEquipos").innerHTML = filaVacia(3, "No se pudieron cargar los datos");
    document.getElementById("feedInicio").innerHTML = `<div class="text-muted small py-3">
        <i class="bi bi-exclamation-triangle me-1"></i>No se pudo cargar la actividad.
      </div>`;
    console.error(e);
  } finally {
    btnRecargar.disabled = false;
  }
}

/* ------------------------------ Actividad ------------------------------ */
const ACCIONES_INICIO = {
  solicitar_renta:      ["bi-send",              "Solicitud enviada"],
  crear_renta:          ["bi-clipboard-plus",    "Renta creada"],
  aprobar_solicitud:    ["bi-check2-circle",     "Solicitud aprobada"],
  rechazar_solicitud:   ["bi-x-circle",          "Solicitud rechazada"],
  cancelar_renta:       ["bi-slash-circle",      "Renta cancelada"],
  cambiar_estado:       ["bi-arrow-repeat",      "Cambio de estado"],
  registrar_devolucion: ["bi-box-arrow-in-down", "Devolución registrada"],
  eliminar_renta:       ["bi-trash",             "Renta eliminada"],
  registrar_pago:       ["bi-cash-coin",         "Pago registrado"],
  crear_cliente:        ["bi-person-plus",       "Cliente creado"],
  actualizar_cliente:   ["bi-pencil-square",     "Cliente actualizado"],
  baja_cliente:         ["bi-person-dash",       "Cliente dado de baja"],
  crear_acceso:         ["bi-key",               "Acceso creado"],
  reactivar_acceso:     ["bi-key-fill",          "Acceso reactivado"],
  revocar_acceso:       ["bi-key",               "Acceso revocado"],
};

function pintarActividad(eventos) {
  const contenedor = document.getElementById("feedInicio");

  if (!eventos.length) {
    contenedor.innerHTML = `<div class="text-muted small py-3">
        <i class="bi bi-activity me-1"></i>Todavía no hay actividad registrada.
      </div>`;
    return;
  }

  contenedor.innerHTML = eventos.map((a) => {
    const [icono, texto] = ACCIONES_INICIO[a.accion] || ["bi-activity", a.accion.replaceAll("_", " ")];
    return `
      <div class="feed-item">
        <div class="feed-icono"><i class="bi ${icono}"></i></div>
        <div>
          <div class="fw-semibold">${escapar(texto)}</div>
          <div class="celda-secundaria">
            ${escapar(a.usuario) || "Sistema"}
            ${a.detalle ? ` · ${escapar(a.detalle)}` : ""}
          </div>
        </div>
        <div class="text-end celda-secundaria text-nowrap">${Comun.fechaHora(a.fecha)}</div>
      </div>`;
  }).join("");
}

btnRecargar.addEventListener("click", cargarPanel);
cargarPanel();
