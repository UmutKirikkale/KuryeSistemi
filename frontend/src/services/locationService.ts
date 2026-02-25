import api from './api';

export const locationService = {
  updateLocation: async (latitude: number, longitude: number, accuracy?: number) => {
    const response = await api.post('/location/update', {
      latitude,
      longitude,
      accuracy
    });
    return response.data;
  },

  getCourierLocations: async () => {
    const response = await api.get('/location/couriers');
    return response.data;
  },

  getCourierLocationHistory: async (
    courierId: string,
    params?: { startDate?: string; endDate?: string; limit?: number }
  ) => {
    const response = await api.get(`/location/history/${courierId}`, { params });
    return response.data;
  },

  toggleAvailability: async () => {
    const response = await api.post('/location/toggle-availability');
    return response.data;
  }
};
