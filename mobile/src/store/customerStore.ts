import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { customerService } from '../services/customerService';

interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string;
}

interface CustomerState {
  customer: Customer | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; name: string; phone: string }) => Promise<void>;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

const CUSTOMER_TOKEN_KEY = 'customerToken';
const CUSTOMER_DATA_KEY = 'customerData';

export const useCustomerStore = create<CustomerState>((set) => ({
  customer: null,
  token: null,
  isAuthenticated: false,
  isHydrated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await customerService.login({ email, password });
      await AsyncStorage.multiSet([
        [CUSTOMER_TOKEN_KEY, response.token],
        [CUSTOMER_DATA_KEY, JSON.stringify(response.customer)]
      ]);

      api.defaults.headers.common.Authorization = `Bearer ${response.token}`;

      set({
        customer: response.customer,
        token: response.token,
        isAuthenticated: true,
        isHydrated: true,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.error || 'Musteri girisi basarisiz'
      });
      throw error;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await customerService.register(payload);
      await AsyncStorage.multiSet([
        [CUSTOMER_TOKEN_KEY, response.token],
        [CUSTOMER_DATA_KEY, JSON.stringify(response.customer)]
      ]);

      api.defaults.headers.common.Authorization = `Bearer ${response.token}`;

      set({
        customer: response.customer,
        token: response.token,
        isAuthenticated: true,
        isHydrated: true,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.error || 'Musteri kaydi basarisiz'
      });
      throw error;
    }
  },

  hydrate: async () => {
    const [token, customerStr] = await Promise.all([
      AsyncStorage.getItem(CUSTOMER_TOKEN_KEY),
      AsyncStorage.getItem(CUSTOMER_DATA_KEY)
    ]);

    if (!token || !customerStr) {
      set({ isHydrated: true });
      return;
    }

    try {
      const customer = JSON.parse(customerStr) as Customer;
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      set({ customer, token, isAuthenticated: true, isHydrated: true, error: null });
    } catch {
      await AsyncStorage.multiRemove([CUSTOMER_TOKEN_KEY, CUSTOMER_DATA_KEY]);
      set({ isHydrated: true, isAuthenticated: false, customer: null, token: null });
    }
  },

  logout: async () => {
    delete api.defaults.headers.common.Authorization;

    set({
      customer: null,
      token: null,
      isAuthenticated: false,
      isHydrated: true,
      error: null
    });

    try {
      await AsyncStorage.multiRemove([CUSTOMER_TOKEN_KEY, CUSTOMER_DATA_KEY]);
    } catch {
      // state already cleared
    }
  }
}));
