import api from './api';

export const formulariosApi = {
  // Formularios
  listar: () => api.get('/formularios'),
  listarDisponibles: () => api.get('/formularios/disponibles'),
  crear: (data) => api.post('/formularios', data),
  obtener: (id) => api.get(`/formularios/${id}`),
  obtenerPublico: (id) => api.get(`/formularios/${id}/publica`),
  obtenerParaResponder: (id) => api.get(`/formularios/${id}/vista`),
  actualizar: (id, data) => api.put(`/formularios/${id}`, data),
  eliminar: (id) => api.delete(`/formularios/${id}`),

  // Campos
  guardarCampos: (id, campos, secciones = []) => api.post(`/formularios/${id}/campos`, { campos, secciones }),

  // Plantilla y mapeos
  subirPlantilla: (id, formData) =>
    api.post(`/formularios/${id}/plantilla`, formData, { timeout: 60000 }),
  guardarMapeos: (id, mapeos) => api.post(`/formularios/${id}/mapeos`, { mapeos }),

  // Respuestas y PDFs
  responder: (id, data) => api.post(`/formularios/${id}/responder`, data),
  listarPdfs: () => api.get('/formularios/pdfs'),
  eliminarPdf: (pdfId) => api.delete(`/formularios/pdfs/${pdfId}`),
  descargarPdf: (respuestaId) => api.get(`/formularios/respuestas/${respuestaId}/pdf`, { maxRedirects: 0 }),
  asociarSolicitud: (respuestaId, solicitudId) =>
    api.put(`/formularios/respuestas/${respuestaId}/solicitud`, { solicitudId }),
};
