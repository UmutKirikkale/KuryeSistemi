import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { adminService } from '../../services/adminService';

export default function AdminCreateCourierScreen() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    vehicleType: 'MOTORCYCLE',
    paymentPerOrder: '0'
  });

  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.email || !form.password || !form.name || !form.phone || !form.vehicleType) {
      Alert.alert('Eksik Bilgi', 'Tum alanlar zorunlu');
      return;
    }

    setLoading(true);
    try {
      await adminService.createCourier({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
        vehicleType: form.vehicleType.trim(),
        paymentPerOrder: Number(form.paymentPerOrder || 0)
      });
      Alert.alert('Basarili', 'Kurye olusturuldu');
      setForm({ email: '', password: '', name: '', phone: '', vehicleType: 'MOTORCYCLE', paymentPerOrder: '0' });
    } catch (error: any) {
      Alert.alert('Hata', error?.response?.data?.message || error?.response?.data?.error || 'Kurye olusturulamadi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Yeni Kurye</Text>
        <TextInput style={styles.input} placeholder="Ad Soyad" placeholderTextColor="#94a3b8" selectionColor="#7c3aed" value={form.name} onChangeText={set('name')} />
        <TextInput style={styles.input} placeholder="E-posta" placeholderTextColor="#94a3b8" selectionColor="#7c3aed" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Sifre" placeholderTextColor="#94a3b8" selectionColor="#7c3aed" value={form.password} onChangeText={set('password')} secureTextEntry={!showPassword} />
        <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.showBtn}>
          <Text style={styles.showBtnText}>{showPassword ? 'Sifreyi Gizle' : 'Sifreyi Goster'}</Text>
        </Pressable>
        <TextInput style={styles.input} placeholder="Telefon" placeholderTextColor="#94a3b8" selectionColor="#7c3aed" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Arac Tipi" placeholderTextColor="#94a3b8" selectionColor="#7c3aed" value={form.vehicleType} onChangeText={set('vehicleType')} />
        <TextInput style={styles.input} placeholder="Siparis Basi Ucret" placeholderTextColor="#94a3b8" selectionColor="#7c3aed" value={form.paymentPerOrder} onChangeText={set('paymentPerOrder')} keyboardType="decimal-pad" />
        <Pressable style={[styles.button, loading && styles.disabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kuryeyi Olustur</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  input: { backgroundColor: '#fff', color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12 },
  showBtn: { marginTop: -6, marginBottom: 10 },
  showBtnText: { color: '#7c3aed', fontWeight: '600', fontSize: 12 },
  button: { backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 }
});
