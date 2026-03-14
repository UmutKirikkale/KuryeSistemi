import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { adminService } from '../../services/adminService';

export default function AdminCreateRestaurantScreen() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    restaurantName: '',
    address: '',
    restaurantPhone: '',
    commissionPerOrder: '0'
  });

  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.email || !form.password || !form.name || !form.phone || !form.restaurantName || !form.address || !form.restaurantPhone) {
      Alert.alert('Eksik Bilgi', 'Tum alanlar zorunlu');
      return;
    }

    setLoading(true);
    try {
      await adminService.createRestaurant({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
        restaurantName: form.restaurantName.trim(),
        address: form.address.trim(),
        restaurantPhone: form.restaurantPhone.trim(),
        commissionPerOrder: Number(form.commissionPerOrder || 0)
      });
      Alert.alert('Basarili', 'Restoran olusturuldu');
      setForm({ email: '', password: '', name: '', phone: '', restaurantName: '', address: '', restaurantPhone: '', commissionPerOrder: '0' });
    } catch (error: any) {
      Alert.alert('Hata', error?.response?.data?.message || error?.response?.data?.error || 'Restoran olusturulamadi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Yeni Restoran</Text>
        <TextInput style={styles.input} placeholder="Hesap Sahibi Adi" value={form.name} onChangeText={set('name')} />
        <TextInput style={styles.input} placeholder="E-posta" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Sifre" value={form.password} onChangeText={set('password')} secureTextEntry />
        <TextInput style={styles.input} placeholder="Sahip Telefon" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Restoran Adi" value={form.restaurantName} onChangeText={set('restaurantName')} />
        <TextInput style={styles.input} placeholder="Adres" value={form.address} onChangeText={set('address')} multiline />
        <TextInput style={styles.input} placeholder="Restoran Telefon" value={form.restaurantPhone} onChangeText={set('restaurantPhone')} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Siparis Basi Komisyon" value={form.commissionPerOrder} onChangeText={set('commissionPerOrder')} keyboardType="decimal-pad" />
        <Pressable style={[styles.button, loading && styles.disabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Restorani Olustur</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12 },
  button: { backgroundColor: '#1d4ed8', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 }
});
