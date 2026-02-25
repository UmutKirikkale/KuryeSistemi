import api from './api';

export interface CreateOrderData {
  pickupAddress: string;
  deliveryAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  deliveryLatitude: number;
  deliveryLongitude: number;
  orderAmount: number;
  courierFee?: number;
  customerName: string;
  customerPhone: string;
  notes?: string;
}

export const orderService = {
  createOrder: async (data: CreateOrderData) => {
    const response = await api.post('/orders', data);
    return response.data;
  },

  getOrders: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getOrderById: async (id: string) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  assignOrder: async (id: string) => {
    const response = await api.post(`/orders/${id}/assign`);
    return response.data;
  },

  updateOrderStatus: async (
    id: string,
    status: string,
    paymentMethod?: 'CASH' | 'CARD',
    cancelReason?: string
  ) => {
    const response = await api.patch(`/orders/${id}/status`, { status, paymentMethod, cancelReason });
    return response.data;
  }
};
