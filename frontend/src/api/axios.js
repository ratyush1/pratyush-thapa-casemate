import axios from 'axios';

// In production, set VITE_API_URL to your backend URL (e.g. https://your-api.railway.app)
const apiHost = import.meta.env.PROD ? import.meta.env.VITE_API_URL : '';
const baseURL = apiHost ? `${apiHost.replace(/\/$/, '')}/api` : '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = String(err.config?.url || '');
      const isAuthEndpoint = /\/auth\/(login|register|forgot-password\/request|forgot-password\/verify-otp)$/.test(url);

      if (isAuthEndpoint) {
        return Promise.reject(err);
      }

      try {
        console.error('API 401 on', err.config?.url, err.response?.data);
      } catch (e) {}
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
