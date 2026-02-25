import api from './api';

export interface RegisterData {
  email: string;
  password: string;  name: string;
  phone?: string;
  role: 'RESTAURANT' | 'COURIER';
  restaurantData?: {
    name: string;
    address: string;
    phone: string;
    commissionPerOrder?: number;
  };
  courierData?: {
    vehicleType?: string;
  };
}

export interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  register: async (data: RegisterData) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};
