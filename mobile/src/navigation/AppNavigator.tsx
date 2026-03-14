import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/LoginScreen';
import CourierNavigator from './CourierNavigator';
import RestaurantNavigator from './RestaurantNavigator';
import AdminNavigator from './AdminNavigator';

export default function AppNavigator() {
  const { isAuthenticated, user, hydrate, isHydrated } = useAuthStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer key={user.role}>
      {user.role === 'COURIER' ? (
        <CourierNavigator />
      ) : user.role === 'RESTAURANT' ? (
        <RestaurantNavigator />
      ) : (
        <AdminNavigator />
      )}
    </NavigationContainer>
  );
}
