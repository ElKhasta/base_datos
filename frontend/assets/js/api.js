/* =====================================================================
   API - Cliente HTTP del frontend
   ---------------------------------------------------------------------
   No usa ninguna librería: solo fetch. Todos los métodos devuelven
   promesas y lanzan un Error con el mensaje que manda el backend.

   La URL se resuelve sola:
     - Si el sitio lo sirve FastAPI (mismo origen), usa "/api".
     - Si abres el HTML con Live Server (puerto 5500), usa localhost:8000.
   ===================================================================== */

const API_BASE = (() => {
  const puertosDev = ["5500", "5501", "8080"];
  const esServidorPropio =
    location.protocol.startsWith("http") && !puertosDev.includes(location.port);
  return esServidorPropio ? `${location.origin}/api` : "http://localhost:8000/api";
})();

/** Convierte un objeto en query string, omitiendo valores vacíos. */
function queryString(filtros = {}) {
  const limpios = Object.entries(filtros).filter(
    ([, v]) => v !== "" && v !== null && v !== undefined
  );
  const qs = new URLSearchParams(limpios).toString();
  return qs ? `?${qs}` : "";
}

const Api = {
  /**
   * Petición genérica.
   * Lanza un Error con el mensaje del backend si la respuesta no es 2xx.
   */
  async pedir(ruta, opciones = {}) {
    const config = { ...opciones };

    // Solo mandamos Content-Type cuando hay cuerpo: así un GET no dispara
    // una petición preflight innecesaria en CORS.
    if (config.body !== undefined) {
      config.headers = { "Content-Type": "application/json", ...(opciones.headers || {}) };
    }

    let respuesta;
    try {
      respuesta = await fetch(API_BASE + ruta, config);
    } catch {
      throw new Error("No se pudo conectar con el servidor. ¿Está corriendo el backend?");
    }

    if (respuesta.status === 204) return null;

    const texto = await respuesta.text();
    let datos = null;
    try {
      datos = texto ? JSON.parse(texto) : null;
    } catch {
      datos = texto;
    }

    if (!respuesta.ok) {
      let mensaje = datos?.detail ?? `Error ${respuesta.status}`;
      // Los errores de validación de Pydantic (422) llegan como lista.
      if (Array.isArray(mensaje)) {
        mensaje = mensaje
          .map((e) => {
            const campo = Array.isArray(e.loc) ? e.loc.slice(1).join(".") : "";
            return campo ? `${campo}: ${e.msg}` : e.msg;
          })
          .join(". ");
      }
      throw new Error(mensaje);
    }

    return datos;
  },

  get(ruta) { return this.pedir(ruta); },
  post(ruta, cuerpo) { return this.pedir(ruta, { method: "POST", body: JSON.stringify(cuerpo) }); },
  put(ruta, cuerpo) { return this.pedir(ruta, { method: "PUT", body: JSON.stringify(cuerpo) }); },
  patch(ruta, cuerpo) { return this.pedir(ruta, { method: "PATCH", body: JSON.stringify(cuerpo) }); },
  del(ruta) { return this.pedir(ruta, { method: "DELETE" }); },

  /* ---------------------------- Atajos por entidad ---------------------------- */
  clientes: {
    listar: (q = "", activos = "") =>
      Api.get(`/clientes${queryString({ q, activos })}`),
    obtener: (id) => Api.get(`/clientes/${id}`),
    crear: (c) => Api.post("/clientes", c),
    editar: (id, c) => Api.put(`/clientes/${id}`, c),
    eliminar: (id) => Api.del(`/clientes/${id}`),
    historial: (id) => Api.get(`/reportes/historial-cliente/${id}`),
  },

  categorias: {
    listar: () => Api.get("/categorias"),
    obtener: (id) => Api.get(`/categorias/${id}`),
    crear: (c) => Api.post("/categorias", c),
    editar: (id, c) => Api.put(`/categorias/${id}`, c),
    eliminar: (id) => Api.del(`/categorias/${id}`),
  },

  equipos: {
    listar: (filtros = {}) => Api.get(`/equipos${queryString(filtros)}`),
    obtener: (id) => Api.get(`/equipos/${id}`),
    crear: (e) => Api.post("/equipos", e),
    editar: (id, e) => Api.put(`/equipos/${id}`, e),
    eliminar: (id) => Api.del(`/equipos/${id}`),
  },

  rentas: {
    listar: (filtros = {}) => Api.get(`/rentas${queryString(filtros)}`),
    obtener: (id) => Api.get(`/rentas/${id}`),
    crear: (renta) => Api.post("/rentas", renta),
    cambiarEstado: (id, estado) => Api.patch(`/rentas/${id}/estado`, { estado }),
    devolver: (id, datos = {}) => Api.post(`/rentas/${id}/devoluciones`, datos),
    eliminar: (id) => Api.del(`/rentas/${id}`),
    pagar: (id, pago) => Api.post(`/rentas/${id}/pagos`, pago),
  },

  pagos: {
    listar: (idRenta) => Api.get(`/rentas/${idRenta}/pagos`),
  },

  reportes: {
    pendientesDevolucion: () => Api.get("/reportes/pendientes-devolucion"),
    ingresosPorCategoria: () => Api.get("/reportes/ingresos-por-categoria"),
    rentasPorEstado: () => Api.get("/reportes/rentas-por-estado"),
    inventarioBajo: (limite = 5) => Api.get(`/reportes/inventario-bajo?limite=${limite}`),
    historialCliente: (id) => Api.get(`/reportes/historial-cliente/${id}`),
    rentasVencidas: () => Api.get("/reportes/rentas-vencidas"),
    topClientes: () => Api.get("/reportes/top-clientes"),
    resumen: () => Api.get("/reportes/resumen"),
  },

  sistema: {
    salud: () => Api.get("/salud"),
    estados: () => Api.get("/estados"),
  },
};

window.Api = Api;
