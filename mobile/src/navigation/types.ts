export type RootStackParamList = {
  Login: undefined;
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
  RestaurantCreate: undefined;
  RestaurantFinancial: undefined;
  RestaurantMap: undefined;
  RestaurantMenu: undefined;
};

export type AdminTabParamList = {
  AdminStats: undefined;
  AdminUsers: undefined;
  AdminCouriers: undefined;
  AdminRestaurants: undefined;
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
