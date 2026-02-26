import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const isCustomerEndpoint = (url?: string): boolean => {
  return typeof url === 'string' && url.includes('/customer/');
};

// Request interceptor - JWT token ekle
api.interceptors.request.use(
  (config) => {
    const isCustomerApi = isCustomerEndpoint(config.url);
    const customerToken = localStorage.getItem('customerToken');
    const systemToken = localStorage.getItem('token');
    const token = isCustomerApi ? customerToken : systemToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Hata yönetimi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isCustomerApi = isCustomerEndpoint(error.config?.url);
      const activeToken = isCustomerApi
        ? localStorage.getItem('customerToken')
        : localStorage.getItem('token');

      if (activeToken === 'demo-token') {
        return Promise.reject(error);
      }

      if (isCustomerApi) {
        localStorage.removeItem('customerToken');
        window.location.href = '/customer/login';
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
