import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const PUBLIC_URLS = ['/auth/login', '/empleados/buscar', '/solicitudes/publica'];
    const isPublic = PUBLIC_URLS.some(u => err.config.url.includes(u));
    if (err.response?.status === 401 && !isPublic) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
