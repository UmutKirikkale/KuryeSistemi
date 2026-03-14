import { api } from './api';

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

export interface AdminCourierPayload {
  email: string;
  password: string;
  name: string;
  phone: string;
  vehicleType: string;
  paymentPerOrder?: number;
}

export interface AdminCourierUpdatePayload {
  name?: string;
  phone?: string;
  vehicleType?: string;
  paymentPerOrder?: number;
  isAvailable?: boolean;
}

export interface AdminRestaurantPayload {
  email: string;
  password: string;
  name: string;
  phone: string;
  restaurantName: string;
  address: string;
  restaurantPhone: string;
  commissionPerOrder?: number;
}

export const adminService = {
  getDashboardStats: async () => {
    const response = await api.get<{ stats: DashboardStats }>('/admin/stats');
    return response.data;
  },

  getAllUsers: async (params?: { page?: number; limit?: number; role?: string }) => {
    const response = await api.get('/admin/users', { params });
    return response.data as {
      users: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        isActive: boolean;
        createdAt: string;
      }>;
      pagination: any;
    };
  },

  getAllOrders: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    period?: 'daily' | 'weekly' | 'monthly';
  }) => {
    const response = await api.get('/admin/orders', { params });
    return response.data as {
      orders: Array<{
        id: string;
        orderNumber: string;
        status: string;
        orderAmount: number;
        createdAt: string;
        sourcePlatform?: string;
        externalOrderId?: string;
        restaurant?: { name?: string };
      }>;
      pagination: any;
    };
  },

  getAllCouriers: async () => {
    const response = await api.get('/admin/couriers');
    return response.data;
  },

  getAllRestaurants: async () => {
    const response = await api.get('/admin/restaurants');
    return response.data;
  },

  createCourier: async (data: AdminCourierPayload) => {
    const response = await api.post('/admin/couriers', data);
    return response.data;
  },

  updateCourier: async (courierId: string, data: AdminCourierUpdatePayload) => {
    const response = await api.patch(`/admin/couriers/${courierId}`, data);
    return response.data;
  },

  deleteCourier: async (courierId: string) => {
    const response = await api.delete(`/admin/couriers/${courierId}`);
    return response.data;
  },

  createRestaurant: async (data: AdminRestaurantPayload) => {
    const response = await api.post('/admin/restaurants', data);
    return response.data;
  },

  updateRestaurantCommission: async (restaurantId: string, commissionPerOrder: number) => {
    const response = await api.patch(`/admin/restaurants/${restaurantId}/commission`, {
      commissionPerOrder
    });
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

  toggleUserStatus: async (userId: string) => {
    const response = await api.patch(`/admin/users/${userId}/toggle-status`);
    return response.data;
  },

  resetAllData: async () => {
    const response = await api.post('/admin/reset-all-data');
    return response.data;
  }
};
