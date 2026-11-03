/* =====================================================================
   API - Cliente HTTP para el front
   Cambia API_BASE si el backend corre en otra dirección/puerto.
   ===================================================================== */

const API_BASE = "http://localhost:8000/api";

const Api = {
  /**
   * Petición genérica.
   * Lanza un Error con el mensaje del backend si la respuesta no es 2xx.
   */
  async pedir(ruta, opciones = {}) {
    const config = {
      headers: { "Content-Type": "application/json", ...(opciones.headers || {}) },
      ...opciones,
    };

    let respuesta;
    try {
      respuesta = await fetch(API_BASE + ruta, config);
    } catch (e) {
      throw new Error("No se pudo conectar con el servidor. ¿Está corriendo el backend?");
    }

    // 204 No Content
    if (respuesta.status === 204) return null;

    const texto = await respuesta.text();
    let datos = null;
    try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }

    if (!respuesta.ok) {
      let mensaje = datos?.detail ?? `Error ${respuesta.status}`;
      // Errores de validación de Pydantic (422) vienen como lista
      if (Array.isArray(mensaje)) {
        mensaje = mensaje.map((e) => e.msg).join(". ");
      }
      throw new Error(mensaje);
    }
    return datos;
  },

  get(ruta)          { return this.pedir(ruta); },
  post(ruta, cuerpo) { return this.pedir(ruta, { method: "POST",   body: JSON.stringify(cuerpo) }); },
  put(ruta, cuerpo)  { return this.pedir(ruta, { method: "PUT",    body: JSON.stringify(cuerpo) }); },
  patch(ruta, cuerpo){ return this.pedir(ruta, { method: "PATCH",  body: JSON.stringify(cuerpo) }); },
  del(ruta)          { return this.pedir(ruta, { method: "DELETE" }); },

  /* ---------- Atajos por entidad ---------- */
  clientes: {
    listar: (q = "", activos = "") =>
      Api.get(`/clientes?q=${encodeURIComponent(q)}${activos !== "" ? `&activos=${activos}` : ""}`),
    obtener: (id) => Api.get(`/clientes/${id}`),
    crear: (c)    => Api.post("/clientes", c),
    editar: (id, c) => Api.put(`/clientes/${id}`, c),
    eliminar: (id)  => Api.del(`/clientes/${id}`),
  },
  categorias: {
    listar: () => Api.get("/categorias"),
    crear: (c) => Api.post("/categorias", c),
    editar: (id, c) => Api.put(`/categorias/${id}`, c),
    eliminar: (id) => Api.del(`/categorias/${id}`),
  },
  equipos: {
    listar: (filtros = {}) => {
      const qs = new URLSearchParams(
        Object.entries(filtros).filter(([, v]) => v !== "" && v !== null && v !== undefined)
      ).toString();
      return Api.get(`/equipos${qs ? "?" + qs : ""}`);
    },
    obtener: (id)   => Api.get(`/equipos/${id}`),
    crear: (e)      => Api.post("/equipos", e),
    editar: (id, e) => Api.put(`/equipos/${id}`, e),
    eliminar: (id)  => Api.del(`/equipos/${id}`),
  },
  rentas: {
    listar: (filtros = {}) => {
      const qs = new URLSearchParams(
        Object.entries(filtros).filter(([, v]) => v !== "" && v !== null && v !== undefined)
      ).toString();
      return Api.get(`/rentas${qs ? "?" + qs : ""}`);
    },
    obtener: (id)     => Api.get(`/rentas/${id}`),
    crear: (renta)    => Api.post("/rentas", renta),
    cambiarEstado: (id, estado) => Api.patch(`/rentas/${id}/estado`, { estado }),
    devolver: (id, datos = {}) => Api.post(`/rentas/${id}/devoluciones`, datos),
    eliminar: (id)    => Api.del(`/rentas/${id}`),
    pagar: (id, pago) => Api.post(`/rentas/${id}/pagos`, pago),
  },
  reportes: {
    pendientesDevolucion: () => Api.get("/reportes/pendientes-devolucion"),
    ingresosPorCategoria: () => Api.get("/reportes/ingresos-por-categoria"),
    rentasPorEstado:      () => Api.get("/reportes/rentas-por-estado"),
    inventarioBajo:       (limite = 5) => Api.get(`/reportes/inventario-bajo?limite=${limite}`),
    historialCliente:     (id) => Api.get(`/reportes/historial-cliente/${id}`),
    rentasVencidas:       () => Api.get("/reportes/rentas-vencidas"),
    topClientes:          () => Api.get("/reportes/top-clientes"),
    resumen:              () => Api.get("/reportes/resumen"),
  },
  sistema: {
    salud:   () => Api.get("/salud"),
    estados: () => Api.get("/estados"),
  },
};

window.Api = Api;
