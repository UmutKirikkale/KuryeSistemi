import { create } from 'zustand';
import { orderService, CreateOrderData } from '../services/orderService';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  orderAmount: number;
  courierFee: number;
  commissionAmount: number;
  customerName: string;
  customerPhone: string;
  paymentMethod?: 'CASH' | 'CARD';
  restaurant?: any;
  courier?: any;
  createdAt: string;
}

interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  fetchOrders: (params?: any) => Promise<void>;
  fetchOrderById: (id: string) => Promise<void>;
  createOrder: (data: CreateOrderData) => Promise<void>;
  assignOrder: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: string, paymentMethod?: 'CASH' | 'CARD', cancelReason?: string) => Promise<void>;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  selectedOrder: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  },

  fetchOrders: async (params?: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await orderService.getOrders(params);
      set({
        orders: response.orders,
        pagination: response.pagination,
        isLoading: false
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch orders',
        isLoading: false
      });
    }
  },

  fetchOrderById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await orderService.getOrderById(id);
      set({
        selectedOrder: response.order,
        isLoading: false
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch order',
        isLoading: false
      });
    }
  },

  createOrder: async (data: CreateOrderData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await orderService.createOrder(data);
      set((state) => ({
        orders: [response.order, ...state.orders],
        isLoading: false
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to create order',
        isLoading: false
      });
      throw error;
    }
  },

  assignOrder: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await orderService.assignOrder(id);
      set((state) => ({
        orders: state.orders.map((order) =>
          order.id === id ? response.order : order
        ),
        selectedOrder: state.selectedOrder?.id === id ? response.order : state.selectedOrder,
        isLoading: false
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to assign order',
        isLoading: false
      });
      throw error;
    }
  },

  updateOrderStatus: async (id: string, status: string, paymentMethod?: 'CASH' | 'CARD', cancelReason?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await orderService.updateOrderStatus(id, status, paymentMethod, cancelReason);
      set((state) => ({
        orders: state.orders.map((order) =>
          order.id === id ? response.order : order
        ),
        selectedOrder: state.selectedOrder?.id === id ? response.order : state.selectedOrder,
        isLoading: false
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to update order status',
        isLoading: false
      });
      throw error;
    }
  },

  addOrder: (order: Order) => {
    set((state) => ({
      orders: [order, ...state.orders]
    }));
  },

  updateOrder: (orderId: string, updates: Partial<Order>) => {
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order
      ),
      selectedOrder:
        state.selectedOrder?.id === orderId
          ? { ...state.selectedOrder, ...updates }
          : state.selectedOrder
    }));
  }
}));
