import api from './api';

export const reportesService = {
  listar: (params) => api.get('/reportes', { params }),
  resumen: (params) => api.get('/reportes/resumen', { params }),
  exportarUrl: (params) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
    return `${import.meta.env.VITE_API_URL}/reportes/exportar?${qs.toString()}`;
  },
};
