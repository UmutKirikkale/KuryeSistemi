import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from './types';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PublicHomeScreen from '../screens/PublicHomeScreen';
import CourierNavigator from './CourierNavigator';
import RestaurantNavigator from './RestaurantNavigator';
import AdminNavigator from './AdminNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

function PublicStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="PublicHome"
        children={({ navigation }) => (
          <PublicHomeScreen
            onStaffLogin={() => navigation.navigate('Login')}
          />
        )}
      />
      <Stack.Screen
        name="Login"
        children={({ navigation }) => (
          <LoginScreen onRegisterPress={() => navigation.navigate('Register')} />
        )}
      />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const {
    isAuthenticated,
    user,
    hydrate,
    isHydrated
  } = useAuthStore();

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

  return (
    <NavigationContainer key={user?.role || 'PUBLIC'}>
      {isAuthenticated && user ? (
        user.role === 'COURIER' ? (
          <CourierNavigator />
        ) : user.role === 'RESTAURANT' ? (
          <RestaurantNavigator />
        ) : (
          <AdminNavigator />
        )
      ) : (
        <PublicStack />
      )}
    </NavigationContainer>
  );
}
