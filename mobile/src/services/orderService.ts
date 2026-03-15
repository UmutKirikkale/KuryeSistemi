import { api } from './api';

export type OrderStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PREPARING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'CARD';

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  pickupAddress: string;
  deliveryAddress: string;
  orderAmount: number;
  courierFee: number;
  commissionAmount: number;
  customerName: string;
  customerPhone: string;
  paymentMethod?: PaymentMethod;
  sourcePlatform?: string;
  externalOrderId?: string;
  notes?: string;
  createdAt: string;
  restaurant?: {
    id: string;
    name: string;
    address: string;
    phone: string;
    latitude?: number;
    longitude?: number;
  };
  courier?: { id: string; name: string; phone: string };
}

export interface CreateOrderData {
  pickupAddress: string;
  deliveryAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  deliveryLatitude: number;
  deliveryLongitude: number;
  orderAmount: number;
  customerName: string;
  customerPhone: string;
  sourcePlatform?: string;
  externalOrderId?: string;
  notes?: string;
}

export const orderService = {
  getOrders: async (params?: { status?: string; page?: number; limit?: number; period?: 'daily' | 'weekly' | 'monthly'; date?: string }) => {
    const response = await api.get<{ orders: Order[]; pagination: any }>('/orders', { params });
    return response.data;
  },

  createOrder: async (data: CreateOrderData) => {
    const response = await api.post<{ order: Order }>('/orders', data);
    return response.data;
  },

  assignOrder: async (id: string) => {
    const response = await api.post<{ order: Order }>(`/orders/${id}/assign`);
    return response.data;
  },

  updateOrderStatus: async (
    id: string,
    status: string,
    paymentMethod?: PaymentMethod,
    cancelReason?: string
  ) => {
    const response = await api.patch<{ order: Order }>(`/orders/${id}/status`, {
      status,
      paymentMethod,
      cancelReason
    });
    return response.data;
  }
};
