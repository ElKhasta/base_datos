/* =====================================================================
   Comun - Utilidades y layout compartido
   ---------------------------------------------------------------------
   Todo lo que usan las páginas: navbar según el rol, sesión, toasts,
   formato de dinero/fechas, badges de estado y diálogos compartidos.

   La sesión SIEMPRE se valida contra el backend (/api/auth/yo). El rol
   que se pinta aquí es solo presentación: los permisos reales viven en
   FastAPI.
   ===================================================================== */

const Comun = (() => {
  /* ------------------------------- Navegación ------------------------------- */
  const PAGINAS_ADMIN = [
    { clave: "inicio",      href: "index.html",       texto: "Inicio",      icono: "bi-speedometer2" },
    { clave: "solicitudes", href: "solicitudes.html", texto: "Solicitudes", icono: "bi-inbox", badge: true },
    { clave: "clientes",    href: "clientes.html",    texto: "Clientes",    icono: "bi-people" },
    { clave: "equipos",     href: "equipos.html",     texto: "Equipos",     icono: "bi-camera-reels" },
    { clave: "rentas",      href: "rentas.html",      texto: "Rentas",      icono: "bi-clipboard-check" },
    { clave: "reportes",    href: "reportes.html",    texto: "Reportes",    icono: "bi-bar-chart" },
    { clave: "actividad",   href: "actividad.html",   texto: "Actividad",   icono: "bi-activity" },
  ];

  const PAGINAS_CLIENTE = [
    { clave: "portal",          href: "portal.html",                  texto: "Catálogo",        icono: "bi-grid" },
    { clave: "mis-solicitudes", href: "portal.html#mis-solicitudes",  texto: "Mis solicitudes", icono: "bi-clipboard-check" },
  ];

  let sesion = null;
  let resolverListo;
  const listo = new Promise((resolve) => { resolverListo = resolve; });

  const esAdmin = () => sesion?.rol === "admin";
  const esCliente = () => sesion?.rol === "cliente";
  const rutaInicio = () => (esAdmin() ? "index.html" : "portal.html");

  function etiquetaRol(rol) {
    return rol === "admin" ? "Administrador" : "Cliente";
  }

  function colorRol(rol) {
    return rol === "admin" ? "text-bg-danger" : "text-bg-info";
  }

  function enlaceActivo(pagina, activa) {
    if (pagina.href.includes("#")) {
      return location.hash === `#${pagina.href.split("#")[1]}` ? "active" : "";
    }
    if (pagina.clave === "portal") {
      return activa === "portal" && !location.hash ? "active" : "";
    }
    return pagina.clave === activa ? "active" : "";
  }

  /* --------------------------------- Navbar --------------------------------- */
  function montarNavbar() {
    const contenedor = document.getElementById("app-navbar");
    if (!contenedor || !sesion) return;

    const activa = document.body.dataset.pagina || "inicio";
    const paginas = esAdmin() ? PAGINAS_ADMIN : PAGINAS_CLIENTE;

    const enlaces = paginas.map((p) => `
      <li class="nav-item">
        <a class="nav-link ${enlaceActivo(p, activa)}" href="${p.href}">
          <i class="bi ${p.icono} me-1"></i>${p.texto}
          ${p.badge ? '<span class="badge rounded-pill text-bg-warning ms-1 d-none" id="badgeSolicitudes">0</span>' : ""}
        </a>
      </li>`).join("");

    const inicial = (sesion.nombre || sesion.email || "?").trim().charAt(0).toUpperCase();

    contenedor.innerHTML = `
      <nav class="navbar navbar-expand-lg navbar-marca shadow-sm sticky-top">
        <div class="container">
          <a class="navbar-brand fw-bold" href="${rutaInicio()}">
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

              ${esAdmin() ? `
                <li class="nav-item ms-lg-2">
                  <a class="nav-link nav-docs" href="/docs" target="_blank" rel="noopener">
                    <i class="bi bi-code-slash me-1"></i>API
                  </a>
                </li>` : ""}

              <li class="nav-item dropdown ms-lg-2">
                <a class="nav-link dropdown-toggle d-flex align-items-center gap-2" href="#"
                   role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <span class="avatar-nav">${escapar(inicial)}</span>
                  <span class="d-none d-lg-inline">${escapar(sesion.nombre)}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end shadow">
                  <li class="px-3 py-2">
                    <div class="fw-semibold">${escapar(sesion.nombre)}</div>
                    <div class="celda-secundaria">${escapar(sesion.email)}</div>
                    <span class="badge ${colorRol(sesion.rol)} mt-1">${etiquetaRol(sesion.rol)}</span>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li>
                    <button class="dropdown-item" type="button" id="btnCambiarPassword">
                      <i class="bi bi-key me-2"></i>Cambiar contraseña
                    </button>
                  </li>
                  <li>
                    <button class="dropdown-item text-danger" type="button" id="btnSalir">
                      <i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>`;

    document.getElementById("btnCambiarPassword")?.addEventListener("click", abrirPassword);
    document.getElementById("btnSalir")?.addEventListener("click", cerrarSesion);

    if (esAdmin()) actualizarBadge();
  }

  async function actualizarBadge() {
    const badge = document.getElementById("badgeSolicitudes");
    if (!badge || !esAdmin()) return;
    try {
      const { pendientes } = await Api.rentas.pendientesConteo();
      badge.textContent = pendientes;
      badge.classList.toggle("d-none", Number(pendientes) === 0);
    } catch {
      /* El badge es informativo: si falla no interrumpimos la página. */
    }
  }

  async function cerrarSesion() {
    try {
      await Api.auth.logout();
    } catch {
      /* Aunque falle, mandamos al login. */
    }
    location.replace("login.html");
  }

  /* --------------------------------- Footer --------------------------------- */
  function montarFooter() {
    const contenedor = document.getElementById("app-footer");
    if (!contenedor) return;

    contenedor.innerHTML = `
      <footer class="pie-pagina mt-5 py-4">
        <div class="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <span><i class="bi bi-database me-1"></i>PostgreSQL 18 &middot; FastAPI &middot; Bootstrap 5</span>
          <span class="text-muted small">RentaVisual &middot; Renta de equipos audiovisuales</span>
        </div>
      </footer>`;
  }

  /* -------------------------------- Extras --------------------------------- */
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

    if (!document.getElementById("modalPassword")) {
      document.body.insertAdjacentHTML(
        "beforeend",
        `<div class="modal fade" id="modalPassword" tabindex="-1" aria-hidden="true">
           <div class="modal-dialog modal-dialog-centered">
             <form class="modal-content" id="formPassword" novalidate>
               <div class="modal-header">
                 <h5 class="modal-title"><i class="bi bi-key me-2"></i>Cambiar contraseña</h5>
                 <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
               </div>
               <div class="modal-body">
                 <div class="mb-3">
                   <label class="form-label requerido" for="passActual">Contraseña actual</label>
                   <input type="password" class="form-control" id="passActual" required autocomplete="current-password" />
                 </div>
                 <div class="mb-3">
                   <label class="form-label requerido" for="passNueva">Nueva contraseña</label>
                   <input type="password" class="form-control" id="passNueva" required minlength="8"
                          autocomplete="new-password" />
                   <div class="form-text">Mínimo 8 caracteres.</div>
                 </div>
                 <div class="mb-0">
                   <label class="form-label requerido" for="passConfirmar">Confirmar contraseña</label>
                   <input type="password" class="form-control" id="passConfirmar" required minlength="8"
                          autocomplete="new-password" />
                   <div class="invalid-feedback">Las contraseñas no coinciden.</div>
                 </div>
               </div>
               <div class="modal-footer">
                 <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                 <button type="submit" class="btn btn-primary" id="btnGuardarPassword">
                   <i class="bi bi-check-lg me-1"></i>Actualizar
                 </button>
               </div>
             </form>
           </div>
         </div>`
      );

      document.getElementById("formPassword").addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const form = evento.currentTarget;
        const actual = document.getElementById("passActual").value;
        const nueva = document.getElementById("passNueva").value;
        const confirmar = document.getElementById("passConfirmar").value;
        const inputConfirmar = document.getElementById("passConfirmar");

        inputConfirmar.setCustomValidity(nueva === confirmar ? "" : "No coinciden");
        if (!form.checkValidity()) {
          form.classList.add("was-validated");
          return;
        }

        const boton = document.getElementById("btnGuardarPassword");
        boton.disabled = true;
        try {
          await Api.auth.cambiarPassword(actual, nueva);
          bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPassword")).hide();
          toast("Contraseña actualizada correctamente");
        } catch (e) {
          error(e);
        } finally {
          boton.disabled = false;
        }
      });
    }
  }

  function abrirPassword() {
    montarExtras();
    const form = document.getElementById("formPassword");
    form.reset();
    form.classList.remove("was-validated");
    document.getElementById("passConfirmar").setCustomValidity("");
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPassword")).show();
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
    Solicitada: "warning",
    Reservada: "info",
    Activa: "primary",
    Finalizada: "success",
    Cancelada: "secondary",
  };

  function badgeEstado(estado) {
    const color = COLOR_ESTADO[estado] || "secondary";
    const icono = estado === "Solicitada" ? '<i class="bi bi-hourglass-split me-1"></i>' : "";
    return `<span class="badge text-bg-${color} badge-estado">${icono}${escapar(estado)}</span>`;
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

  /* ---------------------------------- Sesión ---------------------------------- */
  async function cargarSesion() {
    try {
      sesion = await Api.auth.yo();
      return sesion;
    } catch {
      sesion = null;
      return null;
    }
  }

  async function iniciar() {
    montarExtras();
    montarFooter();

    const soloAdmin = document.body.dataset.soloAdmin === "true";
    const soloCliente = document.body.dataset.soloCliente === "true";

    sesion = await cargarSesion();

    if (!sesion) {
      resolverListo(null);
      const volver = encodeURIComponent(location.pathname + location.search);
      location.replace(`login.html?volver=${volver}`);
      return;
    }

    if (soloAdmin && !esAdmin()) {
      resolverListo(null);
      location.replace("portal.html");
      return;
    }
    if (soloCliente && !esCliente()) {
      resolverListo(null);
      location.replace("index.html");
      return;
    }

    montarNavbar();
    resolverListo(sesion);
    document.dispatchEvent(new CustomEvent("sesion:lista", { detail: sesion }));
  }

  return {
    // Sesión
    get sesion() { return sesion; },
    listo,
    esAdmin,
    esCliente,
    rutaInicio,
    actualizarBadge,
    abrirPassword,
    // Layout
    montarLayout: iniciar,
    confirmar,
    toast,
    error,
    // Formatos
    dinero,
    fecha,
    fechaHora,
    hoyISO,
    sumarDias,
    diasEntre,
    escapar,
    etiquetaRol,
    badgeEstado,
    filaCargando,
    filaVacia,
    debounce,
    llenarSelect,
  };
})();

window.Comun = Comun;

// Los scripts se cargan al final del <body>, así que el DOM ya existe.
document.addEventListener("DOMContentLoaded", async () => {
  await Comun.montarLayout();
});
