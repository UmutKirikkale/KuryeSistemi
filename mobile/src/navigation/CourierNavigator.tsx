import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { CourierTabParamList } from './types';
import CourierOrdersScreen from '../screens/courier/CourierOrdersScreen';
import CourierTrackingScreen from '../screens/courier/CourierTrackingScreen';
import CourierEarningsScreen from '../screens/courier/CourierEarningsScreen';

const Tab = createBottomTabNavigator<CourierTabParamList>();

export default function CourierNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#0f766e' }}>
      <Tab.Screen
        name="CourierOrders"
        component={CourierOrdersScreen}
        options={{ tabBarLabel: 'Siparisler', tabBarIcon: () => <Text>📦</Text> }}
      />
      <Tab.Screen
        name="CourierTracking"
        component={CourierTrackingScreen}
        options={{ tabBarLabel: 'GPS Takip', tabBarIcon: () => <Text>📍</Text> }}
      />
      <Tab.Screen
        name="CourierEarnings"
        component={CourierEarningsScreen}
        options={{ tabBarLabel: 'Kazanclar', tabBarIcon: () => <Text>💰</Text> }}
      />
    </Tab.Navigator>
  );
}
