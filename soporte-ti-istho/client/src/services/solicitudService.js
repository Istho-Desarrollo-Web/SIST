import api from './api';

export const solicitudService = {
  listar: (params) => api.get('/solicitudes', { params }),
  obtener: (id) => api.get(`/solicitudes/${id}`),
  crear: (data) => api.post('/solicitudes', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  actualizar: (id, data) => api.put(`/solicitudes/${id}`, data),
  cambiarEstado: (id, estado, comentarioNotificacion) =>
    api.put(`/solicitudes/${id}/estado`, {
      estado,
      ...(comentarioNotificacion ? { comentarioNotificacion } : {}),
    }),
  asignarTecnico: (id, tecnicoId) => api.put(`/solicitudes/${id}/asignar`, { tecnicoId }),
  agregarComentario: (id, texto) => api.post(`/solicitudes/${id}/comentario`, { texto }),
  calificar: (id, data) => api.put(`/solicitudes/${id}/calificar`, data),
  misTickets: () => api.get('/solicitudes/mis-tickets'),
  bulkAction: (data) => api.patch('/solicitudes/bulk', data),
};
