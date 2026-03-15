import { api } from './api';

export const financialService = {
  getCourierEarnings: async (date?: string) => {
    const response = await api.get('/financial/courier', {
      params: { date }
    });
    return response.data as {
      summary: {
        selectedDay?: string | null;
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
  },

  getCourierSettlement: async (date?: string) => {
    const response = await api.get('/financial/courier/settlement', {
      params: { date }
    });
    return response.data as {
      report: {
        date: string;
        dayKey: string;
        rows: Array<{
          restaurantId: string;
          restaurantName: string;
          packageCount: number;
          grossAmount: number;
          commissionAmount: number;
          courierFeeAmount: number;
          amountToRestaurant: number;
          isClosed: boolean;
        }>;
        totals: {
          totalRestaurants: number;
          totalPackages: number;
          totalGrossAmount: number;
          totalCommissionAmount: number;
          totalCourierFeeAmount: number;
          totalAmountToRestaurant: number;
          closedRestaurants: number;
          openRestaurants: number;
        };
      };
    };
  },

  closeCourierSettlement: async (date?: string) => {
    const response = await api.post('/financial/courier/settlement/close', { date });
    return response.data as {
      message: string;
      report: any;
    };
  },

  closeCourierSettlementForRestaurant: async (restaurantId: string, date?: string) => {
    const response = await api.post('/financial/courier/settlement/close', {
      date,
      restaurantId
    });
    return response.data as {
      message: string;
      report: any;
    };
  },

  reopenCourierSettlementForRestaurant: async (restaurantId: string, date?: string) => {
    const response = await api.post('/financial/courier/settlement/reopen', {
      date,
      restaurantId
    });
    return response.data as {
      message: string;
      report: any;
    };
  }
};
