import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from './types';
import LoginScreen from '../screens/LoginScreen';
import CourierNavigator from './CourierNavigator';
import RestaurantNavigator from './RestaurantNavigator';
import AdminNavigator from './AdminNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, user } = useAuthStore();

  const getInitialRoute = (): keyof RootStackParamList => {
    if (!isAuthenticated || !user) return 'Login';
    if (user.role === 'COURIER') return 'CourierTabs';
    if (user.role === 'RESTAURANT') return 'RestaurantTabs';
    return 'AdminTabs';
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="CourierTabs" component={CourierNavigator} />
        <Stack.Screen name="RestaurantTabs" component={RestaurantNavigator} />
        <Stack.Screen name="AdminTabs" component={AdminNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
