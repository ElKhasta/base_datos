/* =====================================================================
   Pantalla: Clientes
   CRUD completo. DELETE es baja lógica (estatus_activo = false), así que
   se ofrece "Reactivar" para volver a activarlo.
   ===================================================================== */

const { fecha, escapar, toast, error, confirmar, filaCargando, filaVacia, debounce } = Comun;

const tabla = document.getElementById("tablaClientes");
const contador = document.getElementById("contadorClientes");
const buscar = document.getElementById("buscar");
const filtroActivos = document.getElementById("filtroActivos");
const form = document.getElementById("formCliente");
const btnGuardar = document.getElementById("btnGuardarCliente");

const modalCliente = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalCliente"));
const modalHistorial = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalHistorial"));
const modalAcceso = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalAcceso"));
const formAcceso = document.getElementById("formAcceso");

let clientes = [];
let numeroPeticion = 0;
let clienteAcceso = null;

/* ------------------------------ Lectura ------------------------------ */
async function cargar() {
  const q = buscar.value.trim();
  const activos = filtroActivos.value;
  const miPeticion = ++numeroPeticion;

  tabla.innerHTML = filaCargando(7);

  try {
    const datos = await Api.clientes.listar(q, activos);
    if (miPeticion !== numeroPeticion) return; // llegó una respuesta vieja

    clientes = datos;
    pintarTabla();
  } catch (e) {
    if (miPeticion !== numeroPeticion) return;
    tabla.innerHTML = filaVacia(7, "No se pudieron cargar los clientes");
    contador.textContent = "—";
    error(e);
  }
}

function pintarTabla() {
  contador.textContent = `${clientes.length} cliente${clientes.length === 1 ? "" : "s"}`;

  tabla.innerHTML = clientes.map((c) => {
    const activo = c.estatus_activo;
    return `
      <tr>
        <td>
          <div class="celda-principal">${escapar(c.nombre_completo)}</div>
          <div class="celda-secundaria">Cliente #${c.id_cliente}</div>
        </td>
        <td>${escapar(c.telefono) || "—"}</td>
        <td>${escapar(c.email) || "—"}</td>
        <td>
          ${c.tiene_acceso
            ? `<span class="badge ${c.acceso_activo ? "text-bg-success" : "text-bg-secondary"}">
                 ${c.acceso_activo ? "Con acceso" : "Revocado"}
               </span>
               <div class="celda-secundaria">${escapar(c.email_acceso)}</div>`
            : '<span class="badge text-bg-light text-muted">Sin acceso</span>'}
        </td>
        <td>${fecha(c.fecha_alta)}</td>
        <td>
          <span class="badge ${activo ? "text-bg-success" : "text-bg-secondary"} badge-estado">
            ${activo ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td class="text-end acciones-tabla no-print">
          <button class="btn ${c.tiene_acceso && c.acceso_activo ? "btn-outline-success" : "btn-outline-secondary"}"
                  data-accion="acceso" data-id="${c.id_cliente}"
                  title="Acceso al portal" aria-label="Acceso al portal">
            <i class="bi bi-key"></i>
          </button>
          <button class="btn btn-outline-secondary" data-accion="historial" data-id="${c.id_cliente}"
                  title="Ver historial" aria-label="Ver historial">
            <i class="bi bi-clock-history"></i>
          </button>
          <button class="btn btn-outline-primary" data-accion="editar" data-id="${c.id_cliente}"
                  title="Editar" aria-label="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          ${activo
            ? `<button class="btn btn-outline-danger" data-accion="baja" data-id="${c.id_cliente}"
                       title="Dar de baja" aria-label="Dar de baja">
                 <i class="bi bi-person-dash"></i>
               </button>`
            : `<button class="btn btn-outline-success" data-accion="reactivar" data-id="${c.id_cliente}"
                       title="Reactivar" aria-label="Reactivar">
                 <i class="bi bi-person-check"></i>
               </button>`}
        </td>
      </tr>`;
  }).join("") || filaVacia(7, "No se encontraron clientes con ese filtro");
}

/* --------------------------- Formulario --------------------------- */
function abrirFormulario(cliente = null) {
  form.reset();
  form.classList.remove("was-validated");

  document.getElementById("clienteId").value = cliente ? cliente.id_cliente : "";
  document.getElementById("tituloModalCliente").textContent =
    cliente ? "Editar cliente" : "Nuevo cliente";

  document.getElementById("nombre").value = cliente?.nombre_completo ?? "";
  document.getElementById("telefono").value = cliente?.telefono ?? "";
  document.getElementById("email").value = cliente?.email ?? "";
  document.getElementById("activo").checked = cliente ? cliente.estatus_activo : true;

  modalCliente.show();
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!form.checkValidity()) {
    form.classList.add("was-validated");
    return;
  }

  const id = document.getElementById("clienteId").value;
  const payload = {
    nombre_completo: document.getElementById("nombre").value.trim(),
    telefono: document.getElementById("telefono").value.trim() || null,
    email: document.getElementById("email").value.trim() || null,
    estatus_activo: document.getElementById("activo").checked,
  };

  btnGuardar.disabled = true;
  try {
    if (id) {
      await Api.clientes.editar(id, payload);
      toast("Cliente actualizado correctamente");
    } else {
      await Api.clientes.crear(payload);
      toast("Cliente registrado correctamente");
    }
    modalCliente.hide();
    cargar();
  } catch (e) {
    error(e); // muestra el mensaje en español que manda el backend
  } finally {
    btnGuardar.disabled = false;
  }
});

/* --------------------------- Acceso al portal --------------------------- */
function abrirAcceso(cliente) {
  clienteAcceso = cliente;
  formAcceso.reset();
  formAcceso.classList.remove("was-validated");

  document.getElementById("accesoClienteId").value = cliente.id_cliente;
  document.getElementById("accesoEmail").value = cliente.email_acceso || cliente.email || "";
  document.getElementById("accesoNombre").value = "";

  const estado = document.getElementById("accesoEstado");
  if (cliente.tiene_acceso && cliente.acceso_activo) {
    estado.className = "alert alert-success small";
    estado.innerHTML = `<i class="bi bi-check-circle me-1"></i>
      Este cliente ya puede iniciar sesión con <strong>${escapar(cliente.email_acceso)}</strong>.
      Si guardas de nuevo, se actualizará el correo y la contraseña.`;
  } else if (cliente.tiene_acceso) {
    estado.className = "alert alert-warning small";
    estado.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>
      El acceso está revocado. Guardar de nuevo lo reactiva y actualiza la contraseña.`;
  } else {
    estado.className = "alert alert-light border small";
    estado.innerHTML = `<i class="bi bi-info-circle me-1"></i>
      Este cliente todavía no tiene cuenta. Al guardar podrá entrar al portal y ver
      únicamente sus propias solicitudes.`;
  }

  document.getElementById("btnRevocarAcceso").classList.toggle(
    "d-none",
    !(cliente.tiene_acceso && cliente.acceso_activo)
  );

  modalAcceso.show();
}

formAcceso.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!formAcceso.checkValidity()) {
    formAcceso.classList.add("was-validated");
    return;
  }

  const id = document.getElementById("accesoClienteId").value;
  const boton = document.getElementById("btnGuardarAcceso");

  boton.disabled = true;
  try {
    await Api.clientes.acceso(id, {
      email: document.getElementById("accesoEmail").value.trim(),
      password: document.getElementById("accesoPassword").value,
      nombre: document.getElementById("accesoNombre").value.trim() || null,
    });
    toast("Acceso al portal guardado");
    modalAcceso.hide();
    cargar();
  } catch (e) {
    error(e);
  } finally {
    boton.disabled = false;
  }
});

document.getElementById("btnRevocarAcceso").addEventListener("click", async () => {
  if (!clienteAcceso) return;

  const ok = await confirmar({
    titulo: "Revocar acceso al portal",
    texto: `<strong>${escapar(clienteAcceso.nombre_completo)}</strong> ya no podrá iniciar sesión.
            Su cuenta y su historial se conservan; puedes reactivarla después.`,
    boton: "Revocar acceso",
    peligro: true,
  });
  if (!ok) return;

  try {
    await Api.clientes.revocarAcceso(clienteAcceso.id_cliente);
    toast("Acceso revocado");
    modalAcceso.hide();
    cargar();
  } catch (e) {
    error(e);
  }
});

/* ----------------------------- Historial ----------------------------- */
async function verHistorial(cliente) {
  document.getElementById("tituloHistorial").textContent =
    `Historial de ${cliente.nombre_completo}`;
  document.getElementById("tablaHistorial").innerHTML = filaCargando(7);

  modalHistorial.show();

  try {
    const filas = await Api.clientes.historial(cliente.id_cliente);

    document.getElementById("tablaHistorial").innerHTML = filas.map((f) => `
      <tr>
        <td><span class="fw-semibold">#${f.folio}</span></td>
        <td>${fecha(f.fecha_inicio)}</td>
        <td>${escapar(f.equipo)}</td>
        <td class="text-center">${f.cantidad}</td>
        <td class="text-end">${Comun.dinero(f.subtotal)}</td>
        <td>${Comun.badgeEstado(f.estado)}</td>
        <td>${f.fecha_devolucion ? fecha(f.fecha_devolucion)
                                 : '<span class="badge text-bg-warning">Pendiente</span>'}</td>
      </tr>`).join("") || filaVacia(7, "Este cliente todavía no tiene rentas");
  } catch (e) {
    document.getElementById("tablaHistorial").innerHTML = filaVacia(7, "No se pudo cargar el historial");
    error(e);
  }
}

/* ------------------------------ Acciones ------------------------------ */
tabla.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const cliente = clientes.find((c) => c.id_cliente === Number(boton.dataset.id));
  if (!cliente) return;

  try {
    if (boton.dataset.accion === "editar") {
      abrirFormulario(cliente);
      return;
    }

    if (boton.dataset.accion === "historial") {
      await verHistorial(cliente);
      return;
    }

    if (boton.dataset.accion === "acceso") {
      abrirAcceso(cliente);
      return;
    }

    if (boton.dataset.accion === "baja") {
      const ok = await confirmar({
        titulo: "Dar de baja al cliente",
        texto: `<strong>${escapar(cliente.nombre_completo)}</strong> dejará de poder rentar.
                Su historial de rentas se conserva.`,
        boton: "Dar de baja",
        peligro: true,
      });
      if (!ok) return;

      await Api.clientes.eliminar(cliente.id_cliente);
      toast("Cliente dado de baja");
      cargar();
      return;
    }

    if (boton.dataset.accion === "reactivar") {
      await Api.clientes.editar(cliente.id_cliente, {
        nombre_completo: cliente.nombre_completo,
        telefono: cliente.telefono,
        email: cliente.email,
        estatus_activo: true,
      });
      toast("Cliente reactivado");
      cargar();
    }
  } catch (e) {
    error(e);
  }
});

/* ------------------------------ Eventos ------------------------------ */
document.getElementById("btnNuevoCliente").addEventListener("click", () => abrirFormulario());
buscar.addEventListener("input", debounce(cargar, 300));
filtroActivos.addEventListener("change", cargar);

cargar();
