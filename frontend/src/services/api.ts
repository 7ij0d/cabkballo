import axios from 'axios';

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authorization expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('employee');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: { username: string; password: any }) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
};

export const customerService = {
  getAll: async (search?: string) => {
    const res = await api.get('/customers', { params: { search } });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },
  create: async (data: { name: string; phone: string; notes?: string }) => {
    const res = await api.post('/customers', data);
    return res.data;
  },
  update: async (id: string, data: { name: string; phone: string; notes?: string }) => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },
};

export const orderService = {
  getAll: async (filters?: {
    search?: string;
    employeeId?: string;
    status?: string;
    paymentStatus?: string;
    deliveryStatus?: string;
    dateRange?: string;
    operationType?: string;
  }) => {
    const res = await api.get('/orders', { params: filters });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/orders/${id}`);
    return res.data;
  },
  create: async (data: {
    customerName: string;
    customerPhone: string;
    customerNotes?: string;
    employeeId: string;
    orderDate?: string;
    notes?: string;
    discount?: number;
    items: any[];
  }) => {
    const res = await api.post('/orders', data);
    return res.data;
  },
  update: async (id: string, data: {
    status?: string;
    discount?: number;
    notes?: string;
    employeeId?: string;
    orderDate?: string;
  }) => {
    const res = await api.put(`/orders/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/orders/${id}`);
    return res.data;
  },
  updateItemStatus: async (itemId: string, status: string) => {
    const res = await api.put(`/orders/items/${itemId}/status`, { status });
    return res.data;
  },
};

export const paymentService = {
  create: async (data: {
    orderId: string;
    amount: number;
    paymentDate?: string;
    paymentMethod: string;
    customMethodText?: string;
    notes?: string;
    employeeId: string;
  }) => {
    const res = await api.post('/payments', data);
    return res.data;
  },
  getByOrder: async (orderId: string) => {
    const res = await api.get(`/payments/order/${orderId}`);
    return res.data;
  },
};

export const returnService = {
  getAll: async () => {
    const res = await api.get('/returns');
    return res.data;
  },
  create: async (data: {
    orderItemId: string;
    quantityReturned: number;
    returnDate?: string;
    condition: string;
    customCondition?: string;
    notes?: string;
    employeeId: string;
  }) => {
    const res = await api.post('/returns', data);
    return res.data;
  },
};

export const reportService = {
  getDashboard: async () => {
    const res = await api.get('/reports/dashboard');
    return res.data;
  },
  getSummary: async (start: string, end: string) => {
    const res = await api.get('/reports/summary', { params: { start, end } });
    return res.data;
  },
};

export const auditService = {
  getAll: async () => {
    const res = await api.get('/audit');
    return res.data;
  },
};

export default api;
