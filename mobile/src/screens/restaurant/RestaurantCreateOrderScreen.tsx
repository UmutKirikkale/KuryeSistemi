import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { orderService, CreateOrderData } from '../../services/orderService';

type FormState = {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  orderAmount: string;
  notes: string;
};

export default function RestaurantCreateOrderScreen() {
  const [form, setForm] = useState<FormState>({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    orderAmount: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const set = (key: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleCreate = async () => {
    if (!form.customerName || !form.deliveryAddress || !form.orderAmount) {
      Alert.alert('Eksik Bilgi', 'Musteri adi, teslimat adresi ve tutar gereklidir.');
      return;
    }
    const amount = parseFloat(form.orderAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Gecersiz Tutar', 'Lutfen gecerli bir tutar girin.');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateOrderData = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim() || undefined,
        deliveryAddress: form.deliveryAddress.trim(),
        orderAmount: amount,
        notes: form.notes.trim() || undefined,
        paymentMethod: 'CASH'
      };
      await orderService.createOrder(payload);
      Alert.alert('Basarili', 'Siparis olusturuldu', [
        {
          text: 'Tamam',
          onPress: () =>
            setForm({ customerName: '', customerPhone: '', deliveryAddress: '', orderAmount: '', notes: '' })
        }
      ]);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || 'Siparis olusturulamadi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Yeni Siparis</Text>

        <Text style={styles.label}>Musteri Adi *</Text>
        <TextInput
          style={styles.input}
          value={form.customerName}
          onChangeText={set('customerName')}
          placeholder="Musteri adi"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Telefon</Text>
        <TextInput
          style={styles.input}
          value={form.customerPhone}
          onChangeText={set('customerPhone')}
          placeholder="05xx xxx xxxx"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Teslimat Adresi *</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.deliveryAddress}
          onChangeText={set('deliveryAddress')}
          placeholder="Sokak, mahalle, bina no..."
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Siparis Tutari (₺) *</Text>
        <TextInput
          style={styles.input}
          value={form.orderAmount}
          onChangeText={set('orderAmount')}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Not</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.notes}
          onChangeText={set('notes')}
          placeholder="Teslimat notu..."
          multiline
          numberOfLines={2}
        />

        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Siparis Olustur</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  btn: { backgroundColor: '#1d4ed8', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
