import api from './api';

export const usuarioService = {
  listar: (params) => api.get('/usuarios', { params }),
  listarTecnicos: () => api.get('/usuarios/tecnicos'),
  obtener: (id) => api.get(`/usuarios/${id}`),
  crear: (data) => api.post('/usuarios', data),
  actualizar: (id, data) => api.put(`/usuarios/${id}`, data),
  desactivar: (id) => api.delete(`/usuarios/${id}`),
};
