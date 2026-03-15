import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { authService, AuthUser } from '../services/authService';
import { wsService } from '../services/websocket';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  register: (payload: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: 'RESTAURANT' | 'COURIER';
    restaurantData?: {
      name: string;
      address: string;
      phone: string;
    };
    courierData?: {
      vehicleType?: string;
    };
  }) => Promise<AuthUser>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isHydrated: false,
  error: null,

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(payload);
      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));

      api.defaults.headers.common.Authorization = `Bearer ${response.token}`;
      wsService.connect(response.token);

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
        error: null
      });

      return response.user;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.error || 'Kayit basarisiz'
      });
      throw error;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login({ email, password });
      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));

      api.defaults.headers.common.Authorization = `Bearer ${response.token}`;
      wsService.connect(response.token);

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
        error: null
      });

      return response.user;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error?.response?.data?.error || 'Giris basarisiz'
      });
      throw error;
    }
  },

  logout: async () => {
    wsService.disconnect();
    delete api.defaults.headers.common.Authorization;

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrated: true,
      error: null
    });

    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    } catch {
      // State was already cleared; storage cleanup can fail silently.
    }
  },

  hydrate: async () => {
    const [token, userStr] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY)
    ]);

    if (!token || !userStr) {
      set({ isHydrated: true });
      return;
    }

    try {
      const user = JSON.parse(userStr) as AuthUser;
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      wsService.connect(token);
      set({
        user,
        token,
        isAuthenticated: true,
        isHydrated: true
      });
    } catch {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      set({ isHydrated: true });
    }
  }
}));
