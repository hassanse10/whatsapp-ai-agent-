import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (email, password, name, companyName) =>
    api.post('/auth/signup', { email, password, name, companyName }),
  signin: (email, password) =>
    api.post('/auth/signin', { email, password }),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
};

// Agent API
export const agentAPI = {
  getConfig: () => api.get('/agents/me'),
  updateConfig: (agentId, data) => api.put(`/agents/${agentId}`, data),
  getQRCode: (agentId) => api.get(`/agents/${agentId}/qr`),
  connectAgent: (agentId) => api.post(`/agents/${agentId}/connect`),
  disconnectAgent: (agentId) => api.delete(`/agents/${agentId}/disconnect`),
};

// Products API
export const productsAPI = {
  getAll: () => api.get('/products'),
  getById: (productId) => api.get(`/products/${productId}`),
  create: (data) => api.post('/products', data),
  update: (productId, data) => api.put(`/products/${productId}`, data),
  delete: (productId) => api.delete(`/products/${productId}`),
};

// Orders API
export const ordersAPI = {
  getAll: (limit = 50, offset = 0) =>
    api.get('/orders', { params: { limit, offset } }),
  getById: (orderId) => api.get(`/orders/${orderId}`),
  updateStatus: (orderId, status, trackingNumber, estimatedDelivery, deliveryManId) =>
    api.put(`/orders/${orderId}`, { status, trackingNumber, estimatedDelivery, deliveryManId }),
  cancel: (orderId) => api.post(`/orders/${orderId}/cancel`),
};

// Delivery Men API
export const deliveryMenAPI = {
  getAll: () => api.get('/delivery-men'),
  create: (data) => api.post('/delivery-men', data),
  update: (id, data) => api.put(`/delivery-men/${id}`, data),
  delete: (id) => api.delete(`/delivery-men/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getRecentOrders: (limit = 10) =>
    api.get('/dashboard/recent-orders', { params: { limit } }),
  getTopProducts: (limit = 5) =>
    api.get('/dashboard/top-products', { params: { limit } }),
};

export default api;
