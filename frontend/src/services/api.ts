import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sgim_token');
  if (token) {
    if (typeof config.headers?.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

