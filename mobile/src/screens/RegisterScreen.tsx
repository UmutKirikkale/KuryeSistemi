import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function RegisterScreen() {
  const { register, isLoading, error } = useAuthStore();
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    restaurantName: '',
    restaurantAddress: '',
    restaurantPhone: ''
  });

  const handleRegister = async () => {
    if (
      !form.email.trim() ||
      !form.password ||
      !form.name.trim() ||
      !form.restaurantName.trim() ||
      !form.restaurantAddress.trim() ||
      !form.restaurantPhone.trim()
    ) {
      return;
    }

    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        role: 'RESTAURANT',
        restaurantData: {
          name: form.restaurantName.trim(),
          address: form.restaurantAddress.trim(),
          phone: form.restaurantPhone.trim()
        }
      });
    } catch {
      // store error handles UI
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Restoran Kaydi</Text>
        <Text style={styles.subtitle}>Yeni restoran hesabi olusturun</Text>

        <TextInput
          style={styles.input}
          placeholder="E-posta"
          value={form.email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Sifre"
          secureTextEntry
          value={form.password}
          onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Yetkili Ad Soyad"
          value={form.name}
          onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Yetkili Telefon"
          value={form.phone}
          onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
        />

        <TextInput
          style={styles.input}
          placeholder="Restoran Adi"
          value={form.restaurantName}
          onChangeText={(value) => setForm((prev) => ({ ...prev, restaurantName: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Restoran Adresi"
          value={form.restaurantAddress}
          onChangeText={(value) => setForm((prev) => ({ ...prev, restaurantAddress: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Restoran Telefon"
          value={form.restaurantPhone}
          onChangeText={(value) => setForm((prev) => ({ ...prev, restaurantPhone: value }))}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleRegister} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kayit Ol</Text>}
        </Pressable>

        <Text style={styles.note}>Kurye hesaplari admin tarafindan olusturulur.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f4f6f8'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1e293b'
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    color: '#0f172a'
  },
  error: {
    color: '#b91c1c',
    marginBottom: 10
  },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  note: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 12
  }
});
