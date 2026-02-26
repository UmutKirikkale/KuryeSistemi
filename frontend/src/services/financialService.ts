import api from './api';

export const financialService = {
  getRestaurantFinancials: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get('/financial/restaurant', { params });
    return response.data;
  },

  getCourierEarnings: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await api.get('/financial/courier', { params });
    return response.data;
  },

  getDailyReport: async (date?: string) => {
    const response = await api.get('/financial/daily', { params: { date } });
    return response.data;
  },

  getMonthlyReport: async (year?: number, month?: number) => {
    const response = await api.get('/financial/monthly', { params: { year, month } });
    return response.data;
  },

  getCourierSettlement: async (date?: string) => {
    const response = await api.get('/financial/courier/settlement', { params: { date } });
    return response.data;
  },

  closeCourierSettlement: async (date?: string) => {
    const response = await api.post('/financial/courier/settlement/close', { date });
    return response.data;
  }
};
