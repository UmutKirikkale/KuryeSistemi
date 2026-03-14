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

  getAllCouriers: async () => {
    const response = await api.get('/admin/couriers');
    return response.data;
  },

  getAllRestaurants: async () => {
    const response = await api.get('/admin/restaurants');
    return response.data;
  },

  toggleUserStatus: async (userId: string) => {
    const response = await api.patch(`/admin/users/${userId}/toggle-status`);
    return response.data;
  }
};
