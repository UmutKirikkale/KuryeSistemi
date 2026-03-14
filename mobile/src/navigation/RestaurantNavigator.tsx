import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { RestaurantTabParamList } from './types';
import RestaurantOrdersScreen from '../screens/restaurant/RestaurantOrdersScreen';
import RestaurantCreateOrderScreen from '../screens/restaurant/RestaurantCreateOrderScreen';
import RestaurantFinancialScreen from '../screens/restaurant/RestaurantFinancialScreen';

const Tab = createBottomTabNavigator<RestaurantTabParamList>();

export default function RestaurantNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1d4ed8' }}>
      <Tab.Screen
        name="RestaurantOrders"
        component={RestaurantOrdersScreen}
        options={{ tabBarLabel: 'Siparisler', tabBarIcon: () => <Text>📋</Text> }}
      />
      <Tab.Screen
        name="RestaurantCreate"
        component={RestaurantCreateOrderScreen}
        options={{ tabBarLabel: 'Yeni Siparis', tabBarIcon: () => <Text>➕</Text> }}
      />
      <Tab.Screen
        name="RestaurantFinancial"
        component={RestaurantFinancialScreen}
        options={{ tabBarLabel: 'Finansal', tabBarIcon: () => <Text>💵</Text> }}
      />
    </Tab.Navigator>
  );
}
