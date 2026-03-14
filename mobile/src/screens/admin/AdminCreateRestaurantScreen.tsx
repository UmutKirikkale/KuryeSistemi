import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { adminService } from '../../services/adminService';

export default function AdminCreateRestaurantScreen() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        <Text style={styles.sectionHint}>Bu formda hesap sahibi ve restoran bilgileri birlikte olusturulur.</Text>

        <Text style={styles.label}>Hesap Sahibi Adi *</Text>
        <TextInput style={styles.input} placeholder="Orn: Mehmet Demir" placeholderTextColor="#94a3b8" selectionColor="#1d4ed8" value={form.name} onChangeText={set('name')} />

        <Text style={styles.label}>Hesap E-postasi *</Text>
        <TextInput style={styles.input} placeholder="Orn: restoran@example.com" placeholderTextColor="#94a3b8" selectionColor="#1d4ed8" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" />

        <Text style={styles.label}>Sifre *</Text>
        <Text style={styles.inputHint}>En az 6 karakter guclu sifre kullanin.</Text>
        <TextInput style={styles.input} placeholder="Sifre" placeholderTextColor="#94a3b8" selectionColor="#1d4ed8" value={form.password} onChangeText={set('password')} secureTextEntry={!showPassword} />
        <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.showBtn}>
          <Text style={styles.showBtnText}>{showPassword ? 'Sifreyi Gizle' : 'Sifreyi Goster'}</Text>
        </Pressable>

        <Text style={styles.label}>Hesap Sahibi Telefon *</Text>
        <TextInput style={styles.input} placeholder="05xx xxx xx xx" placeholderTextColor="#94a3b8" selectionColor="#1d4ed8" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />

        <Text style={styles.label}>Restoran Adi *</Text>
        <TextInput style={styles.input} placeholder="Restoran gorunur adi" placeholderTextColor="#94a3b8" selectionColor="#1d4ed8" value={form.restaurantName} onChangeText={set('restaurantName')} />

        <Text style={styles.label}>Adres *</Text>
        <TextInput style={styles.input} placeholder="Mahalle, sokak, bina no" placeholderTextColor="#94a3b8" selectionColor="#1d4ed8" value={form.address} onChangeText={set('address')} multiline />

        <Text style={styles.label}>Restoran Telefon *</Text>
        <TextInput style={styles.input} placeholder="Sabit veya cep" placeholderTextColor="#94a3b8" selectionColor="#1d4ed8" value={form.restaurantPhone} onChangeText={set('restaurantPhone')} keyboardType="phone-pad" />

        <Text style={styles.label}>Siparis Basi Komisyon (TL)</Text>
        <Text style={styles.inputHint}>Bos birakilirsa 0 kabul edilir.</Text>
        <TextInput style={styles.input} placeholder="Orn: 45" placeholderTextColor="#94a3b8" selectionColor="#1d4ed8" value={form.commissionPerOrder} onChangeText={set('commissionPerOrder')} keyboardType="decimal-pad" />
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
  sectionHint: { color: '#64748b', fontSize: 12, marginBottom: 12 },
  label: { color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  inputHint: { color: '#64748b', fontSize: 12, marginTop: -2, marginBottom: 8 },
  input: { backgroundColor: '#fff', color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12 },
  showBtn: { marginTop: -6, marginBottom: 10 },
  showBtnText: { color: '#1d4ed8', fontWeight: '600', fontSize: 12 },
  button: { backgroundColor: '#1d4ed8', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 }
});
