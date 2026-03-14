import { api } from './api';

export interface RestaurantProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RestaurantMenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  sortOrder: number;
  categoryId?: string | null;
}

export interface RestaurantMenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  menuItems: RestaurantMenuItem[];
}

export const restaurantService = {
  getProfile: async () => {
    const response = await api.get<{ restaurant: RestaurantProfile }>('/restaurant/profile');
    return response.data;
  },

  updateLocation: async (latitude: number, longitude: number) => {
    const response = await api.patch('/restaurant/location', {
      latitude,
      longitude
    });
    return response.data;
  },

  getCourierLocations: async () => {
    const response = await api.get('/restaurant/courier-locations');
    return response.data as {
      couriers: Array<{
        courierId: string;
        courierName?: string;
        latitude: number;
        longitude: number;
        updatedAt?: string;
      }>;
    };
  },

  getMenu: async () => {
    const response = await api.get('/restaurant/menu');
    return response.data as {
      categories: RestaurantMenuCategory[];
      uncategorizedItems: RestaurantMenuItem[];
    };
  },

  createCategory: async (data: { name: string; sortOrder?: number }) => {
    const response = await api.post('/restaurant/menu/categories', data);
    return response.data;
  },

  deleteCategory: async (categoryId: string) => {
    const response = await api.delete(`/restaurant/menu/categories/${categoryId}`);
    return response.data;
  },

  createMenuItem: async (data: {
    name: string;
    description?: string;
    price: number;
    categoryId?: string | null;
  }) => {
    const response = await api.post('/restaurant/menu/items', data);
    return response.data;
  },

  updateMenuItem: async (itemId: string, data: {
    name?: string;
    description?: string | null;
    price?: number;
    isAvailable?: boolean;
    categoryId?: string | null;
  }) => {
    const response = await api.patch(`/restaurant/menu/items/${itemId}`, data);
    return response.data;
  },

  deleteMenuItem: async (itemId: string) => {
    const response = await api.delete(`/restaurant/menu/items/${itemId}`);
    return response.data;
  }
};
