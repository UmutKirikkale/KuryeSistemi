import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { AdminTabParamList } from './types';
import AdminStatsScreen from '../screens/admin/AdminStatsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminCouriersScreen from '../screens/admin/AdminCouriersScreen';
import AdminRestaurantsScreen from '../screens/admin/AdminRestaurantsScreen';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export default function AdminNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#7c3aed' }}>
      <Tab.Screen
        name="AdminStats"
        component={AdminStatsScreen}
        options={{ tabBarLabel: 'Dashboard', tabBarIcon: () => <Text>📊</Text> }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ tabBarLabel: 'Kullanicilar', tabBarIcon: () => <Text>👥</Text> }}
      />
      <Tab.Screen
        name="AdminCouriers"
        component={AdminCouriersScreen}
        options={{ tabBarLabel: 'Kuryeler', tabBarIcon: () => <Text>🛵</Text> }}
      />
      <Tab.Screen
        name="AdminRestaurants"
        component={AdminRestaurantsScreen}
        options={{ tabBarLabel: 'Restoranlar', tabBarIcon: () => <Text>🍽️</Text> }}
      />
    </Tab.Navigator>
  );
}
