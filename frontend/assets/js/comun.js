/* =====================================================================
   Comun - Utilidades y layout compartido
   ---------------------------------------------------------------------
   Todo lo que usan las 5 páginas: navbar, footer, toasts, formato de
   dinero y fechas, badges de estado y el diálogo de confirmación.

   Este archivo no sabe nada de la base de datos. Solo pinta.
   ===================================================================== */

const Comun = (() => {
  /* ------------------------------- Navegación ------------------------------- */
  const PAGINAS = [
    { clave: "inicio",   href: "index.html",    texto: "Inicio",   icono: "bi-speedometer2" },
    { clave: "clientes", href: "clientes.html", texto: "Clientes", icono: "bi-people" },
    { clave: "equipos",  href: "equipos.html",  texto: "Equipos",  icono: "bi-camera-reels" },
    { clave: "rentas",   href: "rentas.html",   texto: "Rentas",   icono: "bi-clipboard-check" },
    { clave: "reportes", href: "reportes.html", texto: "Reportes", icono: "bi-bar-chart" },
  ];

  function montarNavbar() {
    const contenedor = document.getElementById("app-navbar");
    if (!contenedor) return;

    const activa = document.body.dataset.pagina || "inicio";
    const enlaces = PAGINAS.map(
      (p) => `
        <li class="nav-item">
          <a class="nav-link ${p.clave === activa ? "active" : ""}" href="${p.href}">
            <i class="bi ${p.icono} me-1"></i>${p.texto}
          </a>
        </li>`
    ).join("");

    contenedor.innerHTML = `
      <nav class="navbar navbar-expand-lg navbar-marca shadow-sm sticky-top">
        <div class="container">
          <a class="navbar-brand fw-bold" href="index.html">
            <i class="bi bi-camera-reels-fill me-2"></i>RentaVisual
          </a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
                  data-bs-target="#menuPrincipal" aria-controls="menuPrincipal"
                  aria-expanded="false" aria-label="Abrir menú">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="menuPrincipal">
            <ul class="navbar-nav ms-auto align-items-lg-center">
              ${enlaces}
              <li class="nav-item ms-lg-2">
                <a class="nav-link nav-docs" href="/docs" target="_blank" rel="noopener">
                  <i class="bi bi-code-slash me-1"></i>API
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>`;
  }

  function montarFooter() {
    const contenedor = document.getElementById("app-footer");
    if (!contenedor) return;

    contenedor.innerHTML = `
      <footer class="pie-pagina mt-5 py-4">
        <div class="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <span><i class="bi bi-database me-1"></i>PostgreSQL 18 &middot; FastAPI &middot; Bootstrap 5</span>
          <span class="text-muted small">Proyecto escolar &middot; Renta de equipos audiovisuales</span>
        </div>
      </footer>`;
  }

  function montarExtras() {
    if (!document.getElementById("zonaToasts")) {
      document.body.insertAdjacentHTML(
        "beforeend",
        `<div class="toast-container position-fixed bottom-0 end-0 p-3" id="zonaToasts"></div>`
      );
    }

    if (!document.getElementById("modalConfirmar")) {
      document.body.insertAdjacentHTML(
        "beforeend",
        `<div class="modal fade" id="modalConfirmar" tabindex="-1" aria-hidden="true">
           <div class="modal-dialog modal-dialog-centered">
             <div class="modal-content">
               <div class="modal-header">
                 <h5 class="modal-title" id="confirmarTitulo">¿Continuar?</h5>
                 <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
               </div>
               <div class="modal-body" id="confirmarTexto"></div>
               <div class="modal-footer">
                 <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                 <button type="button" class="btn btn-primary" id="btnConfirmarAccion">Aceptar</button>
               </div>
             </div>
           </div>
         </div>`
      );

      document.getElementById("btnConfirmarAccion").addEventListener("click", () => {
        const resolver = tomarResolver();
        bootstrap.Modal.getOrCreateInstance(document.getElementById("modalConfirmar")).hide();
        if (resolver) resolver(true);
      });
    }
  }

  /* --------------------------- Confirmación (promesa) --------------------------- */
  let resolverConfirmacion = null;

  function tomarResolver() {
    const r = resolverConfirmacion;
    resolverConfirmacion = null;
    return r;
  }

  /**
   * Muestra un diálogo de confirmación y devuelve true/false.
   *
   *   if (await Comun.confirmar({ texto: "¿Eliminar?" })) { ... }
   */
  function confirmar({ titulo = "¿Continuar?", texto = "", boton = "Aceptar", peligro = false } = {}) {
    montarExtras();

    const modalEl = document.getElementById("modalConfirmar");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    document.getElementById("confirmarTitulo").textContent = titulo;
    document.getElementById("confirmarTexto").innerHTML = texto;

    const btn = document.getElementById("btnConfirmarAccion");
    btn.className = `btn ${peligro ? "btn-danger" : "btn-primary"}`;
    btn.textContent = boton;

    return new Promise((resolve) => {
      resolverConfirmacion = resolve;

      modalEl.addEventListener(
        "hidden.bs.modal",
        () => {
          const pendiente = tomarResolver();
          if (pendiente) pendiente(false);
        },
        { once: true }
      );

      modal.show();
    });
  }

  /* ---------------------------------- Toasts ---------------------------------- */
  /** tipo: success | danger | warning | info | secondary */
  function toast(mensaje, tipo = "success") {
    montarExtras();
    const zona = document.getElementById("zonaToasts");

    const el = document.createElement("div");
    el.className = `toast align-items-center text-bg-${tipo} border-0 shadow-sm`;
    el.setAttribute("role", "alert");
    el.setAttribute("aria-live", "assertive");
    el.setAttribute("aria-atomic", "true");
    el.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${escapar(mensaje)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast" aria-label="Cerrar"></button>
      </div>`;

    zona.appendChild(el);
    el.addEventListener("hidden.bs.toast", () => el.remove());
    bootstrap.Toast.getOrCreateInstance(el, { delay: 4500 }).show();
  }

  function error(e) {
    console.error(e);
    toast(e?.message || "Ocurrió un error inesperado", "danger");
  }

  /* --------------------------------- Formatos --------------------------------- */
  const formatoDinero = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });

  /** Convierte "3400.00" o 3400 en "$3,400.00". */
  function dinero(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? formatoDinero.format(n) : "—";
  }

  /** Acepta "2026-11-03" o un ISO completo y devuelve "03/11/2026". */
  function fecha(valor) {
    if (!valor) return "—";
    const soloFecha = String(valor).slice(0, 10);
    const [a, m, d] = soloFecha.split("-");
    if (!a || !m || !d) return String(valor);
    return `${d}/${m}/${a}`;
  }

  function fechaHora(valor) {
    if (!valor) return "—";
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleString("es-MX");
  }

  /** Fecha de hoy en formato YYYY-MM-DD, sin desfase por zona horaria. */
  function hoyISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function sumarDias(iso, dias) {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  }

  /** Días entre dos fechas YYYY-MM-DD, mínimo 1 (igual que el backend). */
  function diasEntre(desde, hasta) {
    const a = new Date(`${desde}T00:00:00`);
    const b = new Date(`${hasta}T00:00:00`);
    const dias = Math.round((b - a) / 86400000);
    return Number.isFinite(dias) ? Math.max(1, dias) : 1;
  }

  /* ---------------------------------- HTML ---------------------------------- */
  /** Escapa texto antes de meterlo en innerHTML (evita inyección de HTML). */
  function escapar(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const COLOR_ESTADO = {
    Reservada: "info",
    Activa: "primary",
    Finalizada: "success",
    Cancelada: "secondary",
  };

  function badgeEstado(estado) {
    const color = COLOR_ESTADO[estado] || "secondary";
    return `<span class="badge text-bg-${color} badge-estado">${escapar(estado)}</span>`;
  }

  function filaCargando(colspan, texto = "Cargando…") {
    return `<tr><td colspan="${colspan}" class="text-center text-muted py-4">
              <span class="spinner-border spinner-border-sm me-2"></span>${escapar(texto)}
            </td></tr>`;
  }

  function filaVacia(colspan, texto = "Sin registros") {
    return `<tr><td colspan="${colspan}" class="text-center text-muted py-4">
              <i class="bi bi-inbox me-1"></i>${escapar(texto)}
            </td></tr>`;
  }

  function debounce(fn, ms = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  /** Llena un <select> conservando el valor actual si sigue existiendo. */
  function llenarSelect(select, opciones, { valor = "", placeholder = null } = {}) {
    if (!select) return;
    const anterior = valor !== "" ? String(valor) : select.value;
    const partes = [];
    if (placeholder !== null) {
      partes.push(`<option value="">${escapar(placeholder)}</option>`);
    }
    for (const o of opciones) {
      partes.push(`<option value="${escapar(o.valor)}">${escapar(o.texto)}</option>`);
    }
    select.innerHTML = partes.join("");
    if (anterior && [...select.options].some((o) => o.value === anterior)) {
      select.value = anterior;
    }
  }

  /* ---------------------------------- Layout ---------------------------------- */
  function montarLayout() {
    montarNavbar();
    montarExtras();
    montarFooter();
  }

  return {
    montarLayout,
    confirmar,
    toast,
    error,
    dinero,
    fecha,
    fechaHora,
    hoyISO,
    sumarDias,
    diasEntre,
    escapar,
    badgeEstado,
    filaCargando,
    filaVacia,
    debounce,
    llenarSelect,
  };
})();

window.Comun = Comun;

// Los scripts se cargan al final del <body>, así que el DOM ya existe.
document.addEventListener("DOMContentLoaded", () => Comun.montarLayout());
