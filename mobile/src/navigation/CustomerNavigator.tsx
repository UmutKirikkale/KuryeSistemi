import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { CustomerTabParamList } from './types';
import MarketplaceScreen from '../screens/customer/MarketplaceScreen';
import CustomerOrderTrackingScreen from '../screens/customer/CustomerOrderTrackingScreen';
import CustomerProfileScreen from '../screens/customer/CustomerProfileScreen';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

export default function CustomerNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2563eb' }}>
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{ tabBarLabel: 'Market', tabBarIcon: () => <Text>🛍️</Text> }}
      />
      <Tab.Screen
        name="CustomerOrderTracking"
        component={CustomerOrderTrackingScreen}
        options={{ tabBarLabel: 'Takip', tabBarIcon: () => <Text>🔎</Text> }}
      />
      <Tab.Screen
        name="CustomerProfile"
        component={CustomerProfileScreen}
        options={{ tabBarLabel: 'Profil', tabBarIcon: () => <Text>👤</Text> }}
      />
    </Tab.Navigator>
  );
}
