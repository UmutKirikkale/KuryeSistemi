import { api } from './api';

export type UserRole = 'COURIER' | 'RESTAURANT' | 'ADMIN';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
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

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export const authService = {
  register: async (data: RegisterData) => {
    const response = await api.post<LoginResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData) => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response.data;
  }
};
