import { api } from './api';

export const locationService = {
  updateLocation: async (latitude: number, longitude: number, accuracy?: number) => {
    const response = await api.post('/location/update', { latitude, longitude, accuracy });
    return response.data;
  },

  getCourierLocations: async () => {
    const response = await api.get('/location/couriers');
    return response.data as {
      couriers: Array<{
        courierId: string;
        courierName?: string;
        latitude: number;
        longitude: number;
        lastUpdated?: string;
        isAvailable?: boolean;
      }>;
    };
  },

  toggleAvailability: async () => {
    const response = await api.post('/location/toggle-availability');
    return response.data as { isAvailable: boolean };
  }
};
