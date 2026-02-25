import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  setCustomer: (customer: Customer, token: string) => void;
  logout: () => void;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      customer: null,
      token: null,
      isAuthenticated: false,
      setCustomer: (customer, token) => {
        set({ customer, token, isAuthenticated: true });
        localStorage.setItem('customerToken', token);
      },
      logout: () => {
        set({ customer: null, token: null, isAuthenticated: false });
        localStorage.removeItem('customerToken');
      },
    }),
    {
      name: 'customer-storage',
    }
  )
);
