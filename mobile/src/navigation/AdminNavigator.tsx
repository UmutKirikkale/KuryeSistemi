import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { AdminStackParamList, AdminTabParamList } from './types';
import AdminStatsScreen from '../screens/admin/AdminStatsScreen';
import AdminOrdersHistoryScreen from '../screens/admin/AdminOrdersHistoryScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminCouriersScreen from '../screens/admin/AdminCouriersScreen';
import AdminRestaurantsScreen from '../screens/admin/AdminRestaurantsScreen';
import AdminCourierDetailScreen from '../screens/admin/AdminCourierDetailScreen';
import AdminRestaurantDetailScreen from '../screens/admin/AdminRestaurantDetailScreen';
import AdminCreateCourierScreen from '../screens/admin/AdminCreateCourierScreen';
import AdminCreateRestaurantScreen from '../screens/admin/AdminCreateRestaurantScreen';
import AdminFinancialScreen from '../screens/admin/AdminFinancialScreen';
import AdminCourierMapScreen from '../screens/admin/AdminCourierMapScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import AdminSettlementScreen from '../screens/admin/AdminSettlementScreen';
import AdminLogsScreen from '../screens/admin/AdminLogsScreen';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#7c3aed' }}>
      <Tab.Screen
        name="AdminStats"
        component={AdminStatsScreen}
        options={{ tabBarLabel: 'Dashboard', tabBarIcon: () => <Text>📊</Text> }}
      />
      <Tab.Screen
        name="AdminOrderHistory"
        component={AdminOrdersHistoryScreen}
        options={{ tabBarLabel: 'Siparis Gecmis', tabBarIcon: () => <Text>🧾</Text> }}
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
      <Tab.Screen
        name="AdminFinancial"
        component={AdminFinancialScreen}
        options={{ tabBarLabel: 'Finans', tabBarIcon: () => <Text>💰</Text> }}
      />
      <Tab.Screen
        name="AdminCourierMap"
        component={AdminCourierMapScreen}
        options={{ tabBarLabel: 'Harita', tabBarIcon: () => <Text>🗺️</Text> }}
      />
      <Tab.Screen
        name="AdminSettings"
        component={AdminSettingsScreen}
        options={{ tabBarLabel: 'Ayarlar', tabBarIcon: () => <Text>⚙️</Text> }}
      />
      <Tab.Screen
        name="AdminSettlement"
        component={AdminSettlementScreen}
        options={{ tabBarLabel: 'Mutabakat', tabBarIcon: () => <Text>📄</Text> }}
      />
      <Tab.Screen
        name="AdminLogs"
        component={AdminLogsScreen}
        options={{ tabBarLabel: 'Loglar', tabBarIcon: () => <Text>📋</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen name="AdminCourierDetail" component={AdminCourierDetailScreen} options={{ title: 'Kurye Detayi' }} />
      <Stack.Screen name="AdminRestaurantDetail" component={AdminRestaurantDetailScreen} options={{ title: 'Restoran Detayi' }} />
      <Stack.Screen name="AdminCreateCourier" component={AdminCreateCourierScreen} options={{ title: 'Yeni Kurye' }} />
      <Stack.Screen name="AdminCreateRestaurant" component={AdminCreateRestaurantScreen} options={{ title: 'Yeni Restoran' }} />
    </Stack.Navigator>
  );
}
