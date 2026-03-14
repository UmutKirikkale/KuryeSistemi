import { api } from './api';

export const locationService = {
  updateLocation: async (latitude: number, longitude: number, accuracy?: number) => {
    const response = await api.post('/location/update', { latitude, longitude, accuracy });
    return response.data;
  },

  toggleAvailability: async () => {
    const response = await api.post('/location/toggle-availability');
    return response.data as { isAvailable: boolean };
  }
};
