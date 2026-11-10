/* =====================================================================
   Pantalla: login / registro
   ---------------------------------------------------------------------
   La cookie de sesión la pone el backend (HttpOnly). Aquí solo se
   capturan las credenciales y se redirige según el rol.
   ===================================================================== */

const formLogin = document.getElementById("formLogin");
const formRegistro = document.getElementById("formRegistro");
const tabLogin = document.getElementById("tabLogin");
const tabRegistro = document.getElementById("tabRegistro");
const alerta = document.getElementById("alertaAuth");

/* ------------------------------- Utilidades ------------------------------- */
function mostrarAlerta(mensaje, tipo = "danger") {
  alerta.className = `alert alert-${tipo}`;
  alerta.textContent = mensaje;
  alerta.classList.remove("d-none");
}

function ocultarAlerta() {
  alerta.classList.add("d-none");
}

function cambiarTab(registro) {
  tabLogin.classList.toggle("activo", !registro);
  tabRegistro.classList.toggle("activo", registro);
  tabLogin.setAttribute("aria-selected", String(!registro));
  tabRegistro.setAttribute("aria-selected", String(registro));

  formLogin.classList.toggle("d-none", registro);
  formRegistro.classList.toggle("d-none", !registro);
  ocultarAlerta();
}

function destino(usuario) {
  const params = new URLSearchParams(location.search);
  const volver = params.get("volver");

  // Solo rutas locales; evita redirecciones a otro sitio.
  if (volver && volver.startsWith("/") && !volver.startsWith("//") && !volver.includes("://")) {
    return volver;
  }
  return usuario.rol === "admin" ? "index.html" : "portal.html";
}

function redirigir(usuario) {
  location.replace(destino(usuario));
}

function cargando(boton, spinner, activo) {
  boton.disabled = activo;
  spinner.classList.toggle("d-none", !activo);
}

/* --------------------------- Sesión ya iniciada --------------------------- */
(async () => {
  try {
    const usuario = await Api.auth.yo();
    if (usuario) redirigir(usuario);
  } catch {
    /* Sin sesión: se queda en el formulario. */
  }
})();

/* --------------------------------- Login --------------------------------- */
formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  ocultarAlerta();

  if (!formLogin.checkValidity()) {
    formLogin.classList.add("was-validated");
    return;
  }

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const boton = document.getElementById("btnLogin");
  const spinner = document.getElementById("spinnerLogin");

  cargando(boton, spinner, true);
  try {
    const usuario = await Api.auth.login(email, password);
    redirigir(usuario);
  } catch (e) {
    mostrarAlerta(e.message || "No se pudo iniciar sesión");
    document.getElementById("loginPassword").select();
  } finally {
    cargando(boton, spinner, false);
  }
});

/* -------------------------------- Registro -------------------------------- */
formRegistro.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  ocultarAlerta();

  const password = document.getElementById("regPassword").value;
  const confirmar = document.getElementById("regConfirmar").value;
  const inputConfirmar = document.getElementById("regConfirmar");
  inputConfirmar.setCustomValidity(password === confirmar ? "" : "No coinciden");

  if (!formRegistro.checkValidity()) {
    formRegistro.classList.add("was-validated");
    return;
  }

  const boton = document.getElementById("btnRegistro");
  const spinner = document.getElementById("spinnerRegistro");

  cargando(boton, spinner, true);
  try {
    const usuario = await Api.auth.registro({
      nombre: document.getElementById("regNombre").value.trim(),
      email: document.getElementById("regEmail").value.trim(),
      telefono: document.getElementById("regTelefono").value.trim() || null,
      password,
    });
    redirigir(usuario);
  } catch (e) {
    mostrarAlerta(e.message || "No se pudo crear la cuenta");
  } finally {
    cargando(boton, spinner, false);
  }
});

/* ------------------------------- Interfaz ------------------------------- */
tabLogin.addEventListener("click", () => cambiarTab(false));
tabRegistro.addEventListener("click", () => cambiarTab(true));

document.getElementById("btnVerPassword").addEventListener("click", (evento) => {
  const input = document.getElementById("loginPassword");
  const icono = evento.currentTarget.querySelector("i");
  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  icono.className = visible ? "bi bi-eye" : "bi bi-eye-slash";
});

document.querySelectorAll("[data-demo]").forEach((boton) => {
  boton.addEventListener("click", () => {
    cambiarTab(false);
    const admin = boton.dataset.demo === "admin";
    document.getElementById("loginEmail").value = admin
      ? "admin@rentavisual.mx"
      : "luis@rentavisual.mx";
    document.getElementById("loginPassword").value = admin ? "Admin123!" : "Cliente123!";
    document.getElementById("loginPassword").focus();
  });
});

cambiarTab(new URLSearchParams(location.search).get("tab") === "registro");
