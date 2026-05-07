import api from './api';

export const dashboardService = {
  resumen: () => api.get('/dashboard/resumen'),
  porTecnico: () => api.get('/dashboard/tecnicos'),
  metricasSLA: () => api.get('/dashboard/sla'),
  tendencias: () => api.get('/dashboard/tendencias'),
  actividadReciente: () => api.get('/dashboard/actividad'),
};
