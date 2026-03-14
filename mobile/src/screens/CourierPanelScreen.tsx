import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function CourierPanelScreen() {
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Kurye Paneli</Text>
      <Text style={styles.subtitle}>Hos geldin, {user?.name}</Text>
      <Text style={styles.info}>Bu adimda mobil panel iskeleti hazirlandi.</Text>
      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Cikis</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f8fafc'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    marginTop: 8,
    color: '#334155'
  },
  info: {
    marginTop: 16,
    color: '#475569'
  },
  button: {
    marginTop: 20,
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600'
  }
});
