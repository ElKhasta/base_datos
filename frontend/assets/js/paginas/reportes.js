/* =====================================================================
   Pantalla: Reportes
   Cada pestaña corresponde a una consulta SQL del backend. Aquí no hay
   lógica de negocio: solo se pinta lo que devuelve la vista/reporte.
   ===================================================================== */

const { dinero, fecha, badgeEstado, escapar, filaCargando, filaVacia,
        llenarSelect } = Comun;

const aviso = document.getElementById("avisoReportes");

function reportarFallo(e) {
  console.error(e);
  aviso.textContent = e.message || "No se pudieron cargar los reportes.";
  aviso.classList.remove("d-none");
}

function limpiarAviso() {
  aviso.classList.add("d-none");
}

/**
 * Barra horizontal de una tabla de distribución.
 * - El ancho se calcula contra el mayor valor (así siempre hay una barra grande).
 * - La etiqueta muestra la participación real sobre el total.
 */
function barra(valor, maximo, total = maximo) {
  const v = Number(valor) || 0;
  const ancho = maximo > 0 ? (v / maximo) * 100 : 0;
  const participacion = total > 0 ? (v / total) * 100 : 0;
  return `<div class="d-flex align-items-center gap-2">
            <div class="barra flex-grow-1"><span style="width:${ancho.toFixed(1)}%"></span></div>
            <span class="small text-muted">${participacion.toFixed(0)}%</span>
          </div>`;
}

const sumar = (filas, campo) =>
  filas.reduce((total, fila) => total + Number(fila[campo] || 0), 0);

function badgeRetraso(dias) {
  const n = Number(dias);
  if (n > 0) return `<span class="badge text-bg-danger">${n} día${n === 1 ? "" : "s"}</span>`;
  if (n === 0) return '<span class="badge text-bg-warning">Vence hoy</span>';
  return '<span class="badge text-bg-secondary">En plazo</span>';
}

/* ------------------------------ Resumen ------------------------------ */
async function cargarResumen() {
  try {
    const r = await Api.reportes.resumen();
    document.getElementById("resumenClientes").textContent = r.clientes_activos;
    document.getElementById("resumenRentas").textContent = r.rentas_activas;
    document.getElementById("resumenIngresos").textContent = dinero(r.ingresos_cobrados);
    document.getElementById("resumenAgotados").textContent = r.equipos_agotados;
  } catch (e) {
    reportarFallo(e);
  }
}

/* ------------------- 1. Pendientes de devolución ------------------- */
async function cargarPendientes() {
  const tb = document.getElementById("tbPendientes");
  tb.innerHTML = filaCargando(7);

  try {
    const filas = await Api.reportes.pendientesDevolucion();
    tb.innerHTML = filas.map((f) => `
      <tr>
        <td>
          <div class="celda-principal">${escapar(f.cliente)}</div>
          <div class="celda-secundaria">Renta #${f.id_renta}</div>
        </td>
        <td>${escapar(f.telefono) || "—"}</td>
        <td>${escapar(f.equipo)}</td>
        <td class="text-center">${f.cantidad}</td>
        <td>${fecha(f.fecha_inicio)}</td>
        <td>${fecha(f.fecha_fin_estimada)}</td>
        <td>${badgeRetraso(f.dias_de_retraso)}</td>
      </tr>`).join("") || filaVacia(7, "Todo el equipo ha sido devuelto");
  } catch (e) {
    tb.innerHTML = filaVacia(7, "No se pudo cargar el reporte");
    reportarFallo(e);
  }
}

/* --------------------- 2. Ingresos por categoría --------------------- */
async function cargarIngresos() {
  const tb = document.getElementById("tbIngresos");
  tb.innerHTML = filaCargando(4);

  try {
    const filas = await Api.reportes.ingresosPorCategoria();
    const maximo = Math.max(0, ...filas.map((f) => Number(f.ingresos_totales)));
    const total = sumar(filas, "ingresos_totales");

    tb.innerHTML = filas.map((f) => `
      <tr>
        <td class="celda-principal">${escapar(f.nombre_categoria)}</td>
        <td class="text-center">${f.articulos_rentados}</td>
        <td class="text-end fw-semibold">${dinero(f.ingresos_totales)}</td>
        <td>${barra(f.ingresos_totales, maximo, total)}</td>
      </tr>`).join("") || filaVacia(4, "Aún no hay ingresos registrados");
  } catch (e) {
    tb.innerHTML = filaVacia(4, "No se pudo cargar el reporte");
    reportarFallo(e);
  }
}

/* ----------------------- 3. Rentas por estado ----------------------- */
async function cargarEstados() {
  const tb = document.getElementById("tbEstados");
  tb.innerHTML = filaCargando(3);

  try {
    const filas = await Api.reportes.rentasPorEstado();
    const maximo = Math.max(0, ...filas.map((f) => Number(f.total_rentas)));
    const total = sumar(filas, "total_rentas");

    tb.innerHTML = filas.map((f) => `
      <tr>
        <td>${badgeEstado(f.estado)}</td>
        <td class="text-center fw-semibold">${f.total_rentas}</td>
        <td>${barra(f.total_rentas, maximo, total)}</td>
      </tr>`).join("") || filaVacia(3, "No hay estados definidos");
  } catch (e) {
    tb.innerHTML = filaVacia(3, "No se pudo cargar el reporte");
    reportarFallo(e);
  }
}

/* ------------------------ 4. Inventario bajo ------------------------ */
async function cargarInventario(limite = 5) {
  const tb = document.getElementById("tbInventario");
  tb.innerHTML = filaCargando(5);

  try {
    const filas = await Api.reportes.inventarioBajo(limite);

    tb.innerHTML = filas.map((f) => {
      const stock = Number(f.stock);
      const disponible = Number(f.disponible);
      const ocupacion = stock > 0 ? ((stock - disponible) / stock) * 100 : 0;
      return `
        <tr>
          <td class="celda-principal">${escapar(f.nombre)}</td>
          <td>${escapar(f.marca) || "—"}</td>
          <td class="text-center">${stock}</td>
          <td class="text-center">
            <span class="badge ${disponible > 0 ? "text-bg-success" : "text-bg-danger"} badge-estado">
              ${disponible}
            </span>
          </td>
          <td>
            <div class="barra"><span style="width:${Math.max(0, Math.min(100, ocupacion)).toFixed(1)}%"></span></div>
          </td>
        </tr>`;
    }).join("") || filaVacia(5, `No hay equipos con stock menor a ${limite}`);
  } catch (e) {
    tb.innerHTML = filaVacia(5, "No se pudo cargar el reporte");
    reportarFallo(e);
  }
}

/* ------------------------- 5. Rentas vencidas ------------------------- */
async function cargarVencidas() {
  const tb = document.getElementById("tbVencidas");
  tb.innerHTML = filaCargando(5);

  try {
    const filas = await Api.reportes.rentasVencidas();
    tb.innerHTML = filas.map((f) => `
      <tr>
        <td class="fw-semibold">#${f.id_renta}</td>
        <td>${escapar(f.cliente)}</td>
        <td>${escapar(f.telefono) || "—"}</td>
        <td>${fecha(f.fecha_fin_estimada)}</td>
        <td class="text-center">${badgeRetraso(f.dias_de_retraso)}</td>
      </tr>`).join("") || filaVacia(5, "No hay rentas vencidas");
  } catch (e) {
    tb.innerHTML = filaVacia(5, "No se pudo cargar el reporte");
    reportarFallo(e);
  }
}

/* -------------------------- 6. Top clientes -------------------------- */
async function cargarTopClientes() {
  const tb = document.getElementById("tbClientes");
  tb.innerHTML = filaCargando(5);

  try {
    const filas = await Api.reportes.topClientes();
    const maximo = Math.max(0, ...filas.map((f) => Number(f.monto_total)));
    const total = sumar(filas, "monto_total");

    tb.innerHTML = filas.map((f, i) => `
      <tr>
        <td class="text-muted">${i + 1}</td>
        <td class="celda-principal">${escapar(f.cliente)}</td>
        <td class="text-center">${f.total_rentas}</td>
        <td class="text-end fw-semibold">${dinero(f.monto_total)}</td>
        <td>${barra(f.monto_total, maximo, total)}</td>
      </tr>`).join("") || filaVacia(5, "Todavía no hay clientes con rentas");
  } catch (e) {
    tb.innerHTML = filaVacia(5, "No se pudo cargar el reporte");
    reportarFallo(e);
  }
}

/* ------------------------ 7. Historial cliente ------------------------ */
async function cargarHistorial(idCliente) {
  const tb = document.getElementById("tbHistorial");
  tb.innerHTML = filaCargando(7);

  try {
    const filas = await Api.reportes.historialCliente(idCliente);

    tb.innerHTML = filas.map((f) => `
      <tr>
        <td class="fw-semibold">#${f.folio}</td>
        <td>${fecha(f.fecha_inicio)}</td>
        <td>${escapar(f.equipo)}</td>
        <td class="text-center">${f.cantidad}</td>
        <td class="text-end">${dinero(f.subtotal)}</td>
        <td>${badgeEstado(f.estado)}</td>
        <td>${f.fecha_devolucion
              ? `<span class="text-success small">${fecha(f.fecha_devolucion)}</span>`
              : '<span class="badge text-bg-warning">Pendiente</span>'}</td>
      </tr>`).join("") || filaVacia(7, "Este cliente no tiene rentas registradas");
  } catch (e) {
    tb.innerHTML = filaVacia(7, "No se pudo cargar el historial");
    reportarFallo(e);
  }
}

async function cargarClientesHistorial() {
  const select = document.getElementById("selectHistorial");

  try {
    const clientes = await Api.clientes.listar();
    llenarSelect(
      select,
      clientes.map((c) => ({ valor: c.id_cliente, texto: c.nombre_completo })),
      { placeholder: "Selecciona un cliente…" }
    );
  } catch (e) {
    reportarFallo(e);
  }
}

/* ------------------------------ Orquestación ------------------------------ */
async function cargarTodo() {
  limpiarAviso();
  document.getElementById("fechaImpresion").textContent =
    `Generado el ${new Date().toLocaleString("es-MX")}`;

  await Promise.all([
    cargarResumen(),
    cargarPendientes(),
    cargarIngresos(),
    cargarEstados(),
    cargarInventario(Number(document.getElementById("limiteInventario").value) || 5),
    cargarVencidas(),
    cargarTopClientes(),
    cargarClientesHistorial(),
  ]);
}

/* -------------------------------- Eventos -------------------------------- */
document.getElementById("btnActualizar").addEventListener("click", cargarTodo);
document.getElementById("btnImprimir").addEventListener("click", () => window.print());

document.getElementById("btnInventario").addEventListener("click", () => {
  const limite = Math.max(1, Number(document.getElementById("limiteInventario").value) || 5);
  document.getElementById("limiteInventario").value = limite;
  cargarInventario(limite);
});

document.getElementById("selectHistorial").addEventListener("change", (evento) => {
  const id = Number(evento.target.value);
  if (id) {
    cargarHistorial(id);
  } else {
    document.getElementById("tbHistorial").innerHTML = filaVacia(
      7, "Elige un cliente para ver su historial"
    );
  }
});

/* Si se entra desde un enlace del panel (ej. reportes.html#vencidas),
   activa la pestaña correspondiente. */
function activarPestanaDesdeHash() {
  if (!location.hash) return;
  const boton = document.querySelector(
    `[data-bs-toggle="tab"][data-bs-target="${location.hash}"]`
  );
  if (boton) bootstrap.Tab.getOrCreateInstance(boton).show();
}

activarPestanaDesdeHash();
cargarTodo();
