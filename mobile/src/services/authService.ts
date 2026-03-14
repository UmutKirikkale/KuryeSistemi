import { api } from './api';

export type UserRole = 'COURIER' | 'RESTAURANT' | 'ADMIN';

export interface LoginData {
  email: string;
  password: string;
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
  login: async (data: LoginData) => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response.data;
  }
};
