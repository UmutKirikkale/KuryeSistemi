import api from './api';

export interface CustomerRegisterPayload {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface CustomerLoginPayload {
  email: string;
  password: string;
}

export interface CustomerAuthResponse {
  message: string;
  token: string;
  customer: {
    id: string;
    email: string;
    name: string;
    phone: string;
  };
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  customer: {
    id: string;
    email: string;
    name: string;
    phone: string;
    savedAddresses: SavedAddress[];
  };
}

export interface SavedAddressPayload {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  restaurantName: string;
  orderAmount: number;
  deliveryAddress: string;
  createdAt: string;
  courier: {
    name: string;
    phone: string;
  } | null;
}

export const customerService = {
  async register(payload: CustomerRegisterPayload): Promise<CustomerAuthResponse> {
    const response = await api.post('/customer/register', payload);
    return response.data;
  },

  async login(payload: CustomerLoginPayload): Promise<CustomerAuthResponse> {
    const response = await api.post('/customer/login', payload);
    return response.data;
  },

  async getProfile(): Promise<CustomerProfile> {
    const response = await api.get('/customer/profile');
    return response.data;
  },

  async getOrders(): Promise<{ orders: CustomerOrder[] }> {
    const response = await api.get('/customer/orders');
    return response.data;
  },

  async createAddress(payload: SavedAddressPayload): Promise<{ message: string; address: SavedAddress }> {
    const response = await api.post('/customer/addresses', payload);
    return response.data;
  },

  async updateAddress(addressId: string, payload: Partial<SavedAddressPayload>): Promise<{ message: string; address: SavedAddress }> {
    const response = await api.put(`/customer/addresses/${addressId}`, payload);
    return response.data;
  },

  async deleteAddress(addressId: string): Promise<{ message: string }> {
    const response = await api.delete(`/customer/addresses/${addressId}`);
    return response.data;
  }
};
