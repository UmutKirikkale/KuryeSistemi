import { api } from './api';

export const financialService = {
  getCourierEarnings: async () => {
    const response = await api.get('/financial/courier');
    return response.data as {
      summary: {
        totalOrders: number;
        paymentPerOrder: number;
        totalEarnings: number;
      };
      orders: any[];
    };
  },

  getRestaurantFinancials: async () => {
    const response = await api.get('/financial/restaurant');
    return response.data as {
      summary: {
        totalEarnings: number;
        totalCommissions: number;
        netBalance: number;
        transactionCount: number;
      };
      transactions: any[];
    };
  }
};
