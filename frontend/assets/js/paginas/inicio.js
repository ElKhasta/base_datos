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

  try {
    const salud = await Api.sistema.salud();

    aviso.className = "alert alert-success d-flex align-items-center gap-2";
    aviso.innerHTML = `<i class="bi bi-check-circle-fill"></i>
      <span>Conectado a <strong>${escapar(salud.base)}</strong> — ${escapar(salud.version.split(",")[0])}</span>`;

    const [resumen, equipos, rentas, vencidas] = await Promise.all([
      Api.reportes.resumen(),
      Api.equipos.listar(),
      Api.rentas.listar(),
      Api.reportes.rentasVencidas(),
    ]);

    document.getElementById("mClientes").textContent = resumen.clientes_activos;
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

  } catch (e) {
    aviso.className = "alert alert-danger d-flex align-items-center gap-2";
    aviso.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i>
                       <span>${escapar(e.message)}</span>`;
    document.getElementById("tablaRentas").innerHTML = filaVacia(5, "No se pudieron cargar los datos");
    document.getElementById("tablaEquipos").innerHTML = filaVacia(3, "No se pudieron cargar los datos");
    console.error(e);
  } finally {
    btnRecargar.disabled = false;
  }
}

btnRecargar.addEventListener("click", cargarPanel);
cargarPanel();
