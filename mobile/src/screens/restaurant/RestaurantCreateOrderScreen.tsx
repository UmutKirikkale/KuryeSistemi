import React, { useEffect, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { orderService, CreateOrderData } from '../../services/orderService';
import { restaurantService } from '../../services/restaurantService';
import { ocrService } from '../../services/ocrService';

type FormState = {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  orderAmount: string;
  sourcePlatform: '' | 'FEEDME' | 'YEMEKSEPETI';
  externalOrderId: string;
  notes: string;
};

export default function RestaurantCreateOrderScreen() {
  const [form, setForm] = useState<FormState>({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    orderAmount: '',
    sourcePlatform: '',
    externalOrderId: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSummary, setOcrSummary] = useState<{
    confidence: number;
    quality?: 'LOW' | 'MEDIUM' | 'HIGH';
    missingFields?: string[];
    extractionSource?: 'AI' | 'OCR';
  } | null>(null);
  const [restaurantProfile, setRestaurantProfile] = useState<{
    address: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await restaurantService.getProfile();
        setRestaurantProfile(res.restaurant);
      } catch {
        setRestaurantProfile(null);
      }
    };

    loadProfile();
  }, []);

  const set = (key: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleOCRFromImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Izin Gerekli', 'OCR icin galeriden foto secme izni gerekli.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const image = result.assets[0];
      setOcrLoading(true);

      const response = await ocrService.extractOrderFromImage(
        image.uri,
        image.fileName || undefined,
        image.mimeType || undefined
      );

      const orderAmount =
        response.suggestions.payableAmount ||
        response.suggestions.orderAmount ||
        0;

      setForm((prev) => ({
        ...prev,
        customerName: response.suggestions.customerName || prev.customerName,
        customerPhone: response.suggestions.customerPhone || prev.customerPhone,
        deliveryAddress: response.suggestions.deliveryAddress || prev.deliveryAddress,
        orderAmount: orderAmount > 0 ? String(orderAmount) : prev.orderAmount,
        notes: response.suggestions.notes || prev.notes
      }));

      setOcrSummary({
        confidence: response.suggestions.confidence || response.data.confidence,
        quality: response.suggestions.quality || response.data.quality,
        missingFields: response.suggestions.missingFields || response.data.missingFields,
        extractionSource:
          response.suggestions.extractionSource ||
          response.extractionSource ||
          response.data.extractionSource
      });

      Alert.alert('Basarili', 'Foto analiz edildi. Alanlari kontrol edip kaydedin.');
    } catch (e: any) {
      Alert.alert('OCR Hatasi', e?.response?.data?.error || e?.message || 'Foto islenemedi');
    } finally {
      setOcrLoading(false);
    }
  };

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

    if (form.sourcePlatform && !form.externalOrderId.trim()) {
      Alert.alert('Eksik Bilgi', 'Platform secildiyse platform siparis numarasi girin.');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateOrderData = {
        pickupAddress: restaurantProfile?.address || 'Restoran',
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim() || '-',
        deliveryAddress: form.deliveryAddress.trim(),
        pickupLatitude: restaurantProfile?.latitude ?? 0,
        pickupLongitude: restaurantProfile?.longitude ?? 0,
        deliveryLatitude: restaurantProfile?.latitude ?? 0,
        deliveryLongitude: restaurantProfile?.longitude ?? 0,
        orderAmount: amount,
        sourcePlatform: form.sourcePlatform || undefined,
        externalOrderId: form.externalOrderId.trim() || undefined,
        notes: form.notes.trim() || undefined
      };
      await orderService.createOrder(payload);
      Alert.alert('Basarili', 'Siparis olusturuldu', [
        {
          text: 'Tamam',
          onPress: () =>
            setForm({ customerName: '', customerPhone: '', deliveryAddress: '', orderAmount: '', sourcePlatform: '', externalOrderId: '', notes: '' })
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

        <View style={styles.ocrBox}>
          <Text style={styles.ocrTitle}>Foto ile Otomatik Doldur (OCR)</Text>
          <Text style={styles.ocrSub}>Fis veya siparis ekran goruntusu secin, form otomatik dolsun.</Text>
          <Pressable
            style={[styles.ocrBtn, ocrLoading && styles.btnDisabled]}
            onPress={handleOCRFromImage}
            disabled={ocrLoading}
          >
            {ocrLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ocrBtnText}>Fotograf Sec ve Analiz Et</Text>}
          </Pressable>
          {!!ocrSummary && (
            <View style={styles.ocrInfo}>
              <Text style={styles.ocrInfoText}>Guven: %{Math.round(ocrSummary.confidence || 0)}</Text>
              <Text style={styles.ocrInfoText}>Kalite: {ocrSummary.quality || '-'}</Text>
              <Text style={styles.ocrInfoText}>Kaynak: {ocrSummary.extractionSource === 'AI' ? 'AI API' : 'OCR Fallback'}</Text>
              {!!ocrSummary.missingFields?.length && (
                <Text style={styles.ocrWarn}>Eksik Alanlar: {ocrSummary.missingFields.join(', ')}</Text>
              )}
            </View>
          )}
        </View>

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

        <Text style={styles.label}>Siparis Platformu</Text>
        <View style={styles.platformRow}>
          <Pressable
            style={[styles.platformChip, form.sourcePlatform === '' && styles.platformChipActive]}
            onPress={() => setForm((prev) => ({ ...prev, sourcePlatform: '', externalOrderId: '' }))}
          >
            <Text style={[styles.platformChipText, form.sourcePlatform === '' && styles.platformChipTextActive]}>Platform Yok</Text>
          </Pressable>
          <Pressable
            style={[styles.platformChip, form.sourcePlatform === 'FEEDME' && styles.platformChipActive]}
            onPress={() => setForm((prev) => ({ ...prev, sourcePlatform: 'FEEDME' }))}
          >
            <Text style={[styles.platformChipText, form.sourcePlatform === 'FEEDME' && styles.platformChipTextActive]}>Feedme</Text>
          </Pressable>
          <Pressable
            style={[styles.platformChip, form.sourcePlatform === 'YEMEKSEPETI' && styles.platformChipActive]}
            onPress={() => setForm((prev) => ({ ...prev, sourcePlatform: 'YEMEKSEPETI' }))}
          >
            <Text style={[styles.platformChipText, form.sourcePlatform === 'YEMEKSEPETI' && styles.platformChipTextActive]}>Yemeksepeti</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Platform Siparis No</Text>
        <TextInput
          style={[styles.input, !form.sourcePlatform && styles.inputDisabled]}
          value={form.externalOrderId}
          onChangeText={set('externalOrderId')}
          editable={!!form.sourcePlatform}
          placeholder={form.sourcePlatform ? 'Orn: YS-123456' : 'Once platform secin'}
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
  ocrBox: { backgroundColor: '#eef2ff', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#c7d2fe' },
  ocrTitle: { fontSize: 14, fontWeight: '700', color: '#312e81' },
  ocrSub: { fontSize: 12, color: '#4338ca', marginTop: 4, marginBottom: 10 },
  ocrBtn: { backgroundColor: '#4338ca', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  ocrBtnText: { color: '#fff', fontWeight: '700' },
  ocrInfo: { marginTop: 10, gap: 4 },
  ocrInfoText: { fontSize: 12, color: '#1e1b4b' },
  ocrWarn: { fontSize: 12, color: '#92400e' },
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
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  platformRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  platformChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0' },
  platformChipActive: { backgroundColor: '#1d4ed8' },
  platformChipText: { color: '#334155', fontSize: 12, fontWeight: '700' },
  platformChipTextActive: { color: '#fff' },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  btn: { backgroundColor: '#1d4ed8', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
