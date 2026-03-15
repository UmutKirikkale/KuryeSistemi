export type RootStackParamList = {
  PublicHome: undefined;
  Login: undefined;
  Register: undefined;
  CourierTabs: undefined;
  RestaurantTabs: undefined;
  AdminTabs: undefined;
};

export type CourierTabParamList = {
  CourierOrders: undefined;
  CourierTracking: undefined;
  CourierEarnings: undefined;
};

export type RestaurantTabParamList = {
  RestaurantOrders: undefined;
  RestaurantOrderHistory: undefined;
  RestaurantCreate: undefined;
  RestaurantFinancial: undefined;
  RestaurantMap: undefined;
  RestaurantMenu: undefined;
};

export type CustomerTabParamList = {
  Marketplace: undefined;
  CustomerOrderTracking: { orderNumber?: string } | undefined;
  CustomerProfile: undefined;
};

export type AdminTabParamList = {
  AdminStats: undefined;
  AdminOrderHistory: undefined;
  AdminUsers: undefined;
  AdminCouriers: undefined;
  AdminRestaurants: undefined;
  AdminFinancial: undefined;
  AdminCourierMap: undefined;
  AdminSettings: undefined;
  AdminSettlement: undefined;
  AdminLogs: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  AdminCourierDetail: {
    courier: any;
  };
  AdminRestaurantDetail: {
    restaurant: any;
  };
  AdminCreateCourier: undefined;
  AdminCreateRestaurant: undefined;
};
