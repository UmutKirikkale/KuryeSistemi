import { create } from 'zustand';
import { authService, LoginData, RegisterData } from '../services/authService';
import { wsService } from '../services/websocket';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'RESTAURANT' | 'COURIER' | 'ADMIN';
  restaurant?: any;
  courierProfile?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loadUser: () => void;
}

const ENABLE_DEMO_LOGIN = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

const DEMO_PASSWORD = '123456';

const demoUsersByEmail: Record<string, User> = {
  'admin@test.com': {
    id: 'demo-admin',
    email: 'admin@test.com',
    name: 'Demo Admin',
    role: 'ADMIN'
  },
  'restaurant@test.com': {
    id: 'demo-restaurant-en',
    email: 'restaurant@test.com',
    name: 'Demo Restaurant',
    role: 'RESTAURANT'
  },
  'restoran@test.com': {
    id: 'demo-restaurant-tr',
    email: 'restoran@test.com',
    name: 'Demo Restoran',
    role: 'RESTAURANT'
  },
  'courier@test.com': {
    id: 'demo-courier-en',
    email: 'courier@test.com',
    name: 'Demo Courier',
    role: 'COURIER'
  },
  'kurye@test.com': {
    id: 'demo-courier-tr',
    email: 'kurye@test.com',
    name: 'Demo Kurye',
    role: 'COURIER'
  }
};

const isLikelyBackendUnavailable = (error: any): boolean => {
  if (!error) {
    return true;
  }

  if (!error.response) {
    return true;
  }

  const contentType = error.response.headers?.['content-type'] || '';
  return String(contentType).includes('text/html');
};

const getDemoUser = (data: LoginData): User | null => {
  if (data.password !== DEMO_PASSWORD) {
    return null;
  }

  return demoUsersByEmail[data.email.toLowerCase()] || null;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (data: LoginData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login(data);

      if (!response?.token || !response?.user?.role) {
        throw new Error('Invalid login response');
      }

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false
      });

      // WebSocket bağlantısı kur
      wsService.connect(response.token);
    } catch (error: any) {
      const demoUser = getDemoUser(data);

      if (ENABLE_DEMO_LOGIN && demoUser && isLikelyBackendUnavailable(error)) {
        const demoToken = 'demo-token';
        localStorage.setItem('token', demoToken);
        localStorage.setItem('user', JSON.stringify(demoUser));

        set({
          user: demoUser,
          token: demoToken,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });

        return;
      }

      set({
        error: error.response?.data?.error || 'Login failed',
        isLoading: false
      });
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(data);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false
      });

      // WebSocket bağlantısı kur
      wsService.connect(response.token);
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Registration failed',
        isLoading: false
      });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    wsService.disconnect();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null
    });
  },

  loadUser: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      const user = JSON.parse(userStr);
      set({
        user,
        token,
        isAuthenticated: true
      });

      // WebSocket bağlantısı kur
      wsService.connect(token);
    }
  }
}));

// Sayfa yüklendiğinde kullanıcıyı yükle
useAuthStore.getState().loadUser();
