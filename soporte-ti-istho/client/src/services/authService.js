import api from './api';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  cambiarPassword: (data) => api.put('/auth/cambiar-password', data),
};
