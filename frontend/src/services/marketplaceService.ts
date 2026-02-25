import api from './api';

export interface MarketplaceRestaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude?: number | null;
  longitude?: number | null;
  availableMenuItemCount: number;
}

export interface MarketplaceMenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
}

export interface MarketplaceMenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  menuItems: MarketplaceMenuItem[];
}

export interface MarketplaceMenuResponse {
  restaurant: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  categories: MarketplaceMenuCategory[];
  uncategorizedItems: MarketplaceMenuItem[];
}

export interface MarketplaceCheckoutPayload {
  restaurantId: string;
  savedAddressId: string;
  notes?: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
}

export interface MarketplaceCheckoutResponse {
  message: string;
  order: {
    id: string;
    orderNumber: string;
    restaurantName: string;
    orderAmount: number;
  };
}

export interface MarketplaceOrderStatusResponse {
  order: {
    orderNumber: string;
    status: string;
    orderAmount: number;
    createdAt: string;
    customerName: string;
    customerPhone: string;
    notes: string | null;
    pickup: {
      address: string;
      restaurant: string;
    };
    delivery: {
      address: string;
    };
    courier: {
      name: string;
      phone: string;
    } | null;
  };
}

export interface MarketplaceOrderRatingPayload {
  speedScore: number;
  tasteScore: number;
  priceScore: number;
}

export interface MarketplaceOrderRatingResponse {
  rating: {
    id: string;
    speedScore: number;
    tasteScore: number;
    priceScore: number;
    createdAt: string;
  } | null;
}

export const marketplaceService = {
  async getRestaurants(): Promise<{ restaurants: MarketplaceRestaurant[] }> {
    const response = await api.get('/marketplace/restaurants');
    return response.data;
  },

  async getRestaurantMenu(restaurantId: string): Promise<MarketplaceMenuResponse> {
    const response = await api.get(`/marketplace/restaurants/${restaurantId}/menu`);
    return response.data;
  },

  async createOrder(payload: MarketplaceCheckoutPayload): Promise<MarketplaceCheckoutResponse> {
    const response = await api.post('/marketplace/orders', payload);
    return response.data;
  },

  async getOrderStatus(orderNumber: string): Promise<MarketplaceOrderStatusResponse> {
    const response = await api.get(`/marketplace/orders/${orderNumber}`);
    return response.data;
  },

  async getOrderRating(orderNumber: string): Promise<MarketplaceOrderRatingResponse> {
    const response = await api.get(`/marketplace/orders/${orderNumber}/rating`);
    return response.data;
  },

  async submitOrderRating(
    orderNumber: string,
    payload: MarketplaceOrderRatingPayload
  ): Promise<MarketplaceOrderRatingResponse> {
    const response = await api.post(`/marketplace/orders/${orderNumber}/rating`, payload);
    return response.data;
  }
};
