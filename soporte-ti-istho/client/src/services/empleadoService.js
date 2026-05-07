import api from './api';

export const empleadoService = {
  listar: (params) => api.get('/empleados', { params }),
  obtener: (id) => api.get(`/empleados/${id}`),
  buscar: (identificacion) => api.get('/empleados/buscar', { params: { identificacion } }),
  crear: (data) => api.post('/empleados', data),
  actualizar: (id, data) => api.put(`/empleados/${id}`, data),
  desactivar: (id) => api.delete(`/empleados/${id}`),
};
