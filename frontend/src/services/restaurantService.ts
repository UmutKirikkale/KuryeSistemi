import api from './api';

export const restaurantService = {
  // Restoran profili getir
  getProfile: async () => {
    const response = await api.get('/restaurant/profile');
    return response.data;
  },

  // Restoran konumunu güncelle
  updateLocation: async (latitude: number, longitude: number) => {
    const response = await api.patch('/restaurant/location', {
      latitude,
      longitude
    });
    return response.data;
  },

  // Kurye konumlarını getir
  getCourierLocations: async () => {
    const response = await api.get('/restaurant/courier-locations');
    return response.data;
  },

  // Menü yönetimi
  getMenu: async () => {
    const response = await api.get('/restaurant/menu');
    return response.data;
  },

  createCategory: async (data: { name: string; sortOrder?: number }) => {
    const response = await api.post('/restaurant/menu/categories', data);
    return response.data;
  },

  updateCategory: async (categoryId: string, data: { name?: string; sortOrder?: number }) => {
    const response = await api.patch(`/restaurant/menu/categories/${categoryId}`, data);
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
    imageUrl?: string;
    isAvailable?: boolean;
    sortOrder?: number;
    categoryId?: string | null;
  }) => {
    const response = await api.post('/restaurant/menu/items', data);
    return response.data;
  },

  updateMenuItem: async (
    itemId: string,
    data: {
      name?: string;
      description?: string | null;
      price?: number;
      imageUrl?: string | null;
      isAvailable?: boolean;
      sortOrder?: number;
      categoryId?: string | null;
    }
  ) => {
    const response = await api.patch(`/restaurant/menu/items/${itemId}`, data);
    return response.data;
  },

  deleteMenuItem: async (itemId: string) => {
    const response = await api.delete(`/restaurant/menu/items/${itemId}`);
    return response.data;
  }
};
