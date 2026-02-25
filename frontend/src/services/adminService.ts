import api from './api';

export interface DashboardStats {
  totalUsers: number;
  totalRestaurants: number;
  totalCouriers: number;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalRevenue: number;
  todayRevenue: number;
}

export const adminService = {
  getDashboardStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getAllUsers: async (params?: { page?: number; limit?: number; role?: string }) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getAllOrders: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get('/admin/orders', { params });
    return response.data;
  },

  getAllRestaurants: async () => {
    const response = await api.get('/admin/restaurants');
    return response.data;
  },

  getAllCouriers: async () => {
    const response = await api.get('/admin/couriers');
    return response.data;
  },

  getCourierPerformanceReport: async (courierId: string, days = 7) => {
    const response = await api.get(`/admin/couriers/${courierId}/performance`, {
      params: { days }
    });
    return response.data;
  },

  toggleUserStatus: async (userId: string) => {
    const response = await api.patch(`/admin/users/${userId}/toggle-status`);
    return response.data;
  },

  getSystemLogs: async (limit?: number) => {
    const response = await api.get('/admin/logs', { params: { limit } });
    return response.data;
  },

  createCourier: async (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    vehicleType: string;
    paymentPerOrder?: number;
  }) => {
    const response = await api.post('/admin/couriers', data);
    return response.data;
  },

  deleteCourier: async (courierId: string) => {
    const response = await api.delete(`/admin/couriers/${courierId}`);
    return response.data;
  },

  updateCourier: async (courierId: string, data: {
    name?: string;
    phone?: string;
    vehicleType?: string;
    paymentPerOrder?: number;
    isAvailable?: boolean;
  }) => {
    const response = await api.patch(`/admin/couriers/${courierId}`, data);
    return response.data;
  },

  createRestaurant: async (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    restaurantName: string;
    address: string;
    restaurantPhone: string;
    commissionPerOrder?: number;
  }) => {
    const response = await api.post('/admin/restaurants', data);
    return response.data;
  },

  deleteRestaurant: async (restaurantId: string) => {
    const response = await api.delete(`/admin/restaurants/${restaurantId}`);
    return response.data;
  },

  getRestaurantFinancialReport: async (restaurantId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    const response = await api.get(`/admin/restaurants/${restaurantId}/financial-report`, {
      params: { period }
    });
    return response.data;
  },

  updateRestaurantCommission: async (restaurantId: string, commissionPerOrder: number) => {
    const response = await api.patch(`/admin/restaurants/${restaurantId}/commission`, {
      commissionPerOrder
    });
    return response.data;
  },

  getSystemSettings: async () => {
    const response = await api.get('/admin/settings');
    return response.data;
  },

  updateSystemSettings: async (data: { courierAutoBusyAfterOrders: number }) => {
    const response = await api.patch('/admin/settings', data);
    return response.data;
  }
};
