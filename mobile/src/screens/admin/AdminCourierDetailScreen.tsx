import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { adminService } from '../../services/adminService';

interface PerformanceReport {
  courier: { name: string; email: string; paymentPerOrder: number };
  summary: {
    totalAssigned: number;
    deliveredCount: number;
    cancelledCount: number;
    cancelRate: number;
    averageDeliveryMinutes: number;
    totalEarnings: number;
  };
  dailyEarnings: Array<{ date: string; deliveries: number; earnings: number }>;
  cancelReasons: Array<{ reason: string; count: number }>;
}
export default function AdminCourierDetailScreen({ route, navigation }: any) {
  const [courier, setCourier] = useState(route.params.courier);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [perfLoading, setPerfLoading] = useState(false);
  const [performance, setPerformance] = useState<PerformanceReport | null>(null);
  const [perfDays, setPerfDays] = useState('7');
  const [name, setName] = useState(courier.name || courier.user?.name || '');
  const [phone, setPhone] = useState(courier.user?.phone || '');
  const [vehicleType, setVehicleType] = useState(courier.vehicleType || '');
  const [paymentPerOrder, setPaymentPerOrder] = useState(String(courier.paymentPerOrder || 0));
  const [isAvailable, setIsAvailable] = useState(Boolean(courier.isAvailable));
  const displayName = courier.name || courier.user?.name || 'Kurye';
  const displayEmail = courier.email || courier.user?.email || '-';
  const displayPhone = courier.user?.phone || '-';
  const deliveredOrders = courier.totalOrders ?? courier.stats?.deliveredOrders ?? 0;

  const cards = [
    { label: 'Teslimat', value: String(deliveredOrders), tone: '#0f766e', bg: '#ecfdf5' },
    { label: 'Musaitlik', value: courier.isAvailable ? 'Musait' : 'Mesgul', tone: courier.isAvailable ? '#2563eb' : '#ea580c', bg: courier.isAvailable ? '#eff6ff' : '#fff7ed' },
    { label: 'Bugun Busy', value: String(courier.stats?.busyToggles?.daily || 0), tone: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Aylik Busy', value: String(courier.stats?.busyToggles?.monthly || 0), tone: '#be123c', bg: '#fff1f2' }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await adminService.updateCourier(courier.user?.id || courier.id, {
        name: name.trim(),
        phone: phone.trim(),
        vehicleType: vehicleType.trim(),
        paymentPerOrder: Number(paymentPerOrder || 0),
        isAvailable
      });
      setCourier((prev: any) => ({
        ...prev,
        ...response.courier,
        user: {
          ...prev.user,
          name: response.courier.name,
          phone: response.courier.phone,
          email: response.courier.email
        }
      }));
      Alert.alert('Basarili', 'Kurye guncellendi');
    } catch (error: any) {
      Alert.alert('Hata', error?.response?.data?.message || error?.response?.data?.error || 'Kurye guncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadPerformance = async () => {
    const days = parseInt(perfDays, 10);
    if (isNaN(days) || days < 1) { Alert.alert('Hata', 'Geçerli gün sayısı girin'); return; }
    setPerfLoading(true);
    try {
      const report = await adminService.getCourierPerformanceReport(courier.user?.id || courier.id, days);
      setPerformance(report.report ?? report);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.error || 'Rapor yüklenemedi');
    } finally {
      setPerfLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Kuryeyi Sil', 'Bu kuryeyi silmek istediginize emin misiniz?', [
      { text: 'Vazgec', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await adminService.deleteCourier(courier.user?.id || courier.id);
            navigation.goBack();
          } catch (error: any) {
            Alert.alert('Hata', error?.response?.data?.message || error?.response?.data?.error || 'Kurye silinemedi');
          } finally {
            setDeleting(false);
          }
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{displayName}</Text>
      <Text style={styles.subtitle}>{displayEmail}</Text>

      <View style={styles.metaBox}>
        <Text style={styles.meta}>Telefon: {displayPhone}</Text>
        <Text style={styles.meta}>Arac: {courier.vehicleType || '-'}</Text>
        <Text style={styles.meta}>Siparis Basi Ucret: {Number(courier.paymentPerOrder || 0).toFixed(2)} ₺</Text>
        <Text style={styles.meta}>Konum Kaydi: {Number(courier._count?.locationHistory || 0)}</Text>
      </View>

      <View style={styles.formBox}>
        <Text style={styles.sectionTitle}>Kurye Duzenle</Text>
        <Text style={styles.sectionHint}>Bu alanlar kurye hesabini dogrudan gunceller. Degisiklikler aninda aktif olur.</Text>

        <Text style={styles.fieldLabel}>Ad Soyad</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Orn: Ahmet Yilmaz" />

        <Text style={styles.fieldLabel}>Telefon</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />

        <Text style={styles.fieldLabel}>Arac Tipi</Text>
        <TextInput style={styles.input} value={vehicleType} onChangeText={setVehicleType} placeholder="MOTORCYCLE / CAR / BICYCLE" />

        <Text style={styles.fieldLabel}>Siparis Basi Ucret (TL)</Text>
        <TextInput style={styles.input} value={paymentPerOrder} onChangeText={setPaymentPerOrder} placeholder="Orn: 100" keyboardType="decimal-pad" />
        <Text style={styles.fieldHint}>Kurye her teslim edilen siparis icin bu tutari kazanir.</Text>

        <View style={styles.switchRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.switchLabel}>Musaitlik</Text>
            <Text style={styles.fieldHint}>Musait kapaliysa kurye yeni siparis alamaz.</Text>
          </View>
          <Switch value={isAvailable} onValueChange={setIsAvailable} />
        </View>
        <Pressable style={[styles.primaryButton, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Degisiklikleri Kaydet</Text>}
        </Pressable>
        <Pressable style={[styles.dangerButton, deleting && styles.disabled]} onPress={handleDelete} disabled={deleting}>
          {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Kuryeyi Kalici Olarak Sil</Text>}
        </Pressable>
      </View>

      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.label} style={[styles.card, { backgroundColor: card.bg }]}>
            <Text style={styles.cardLabel}>{card.label}</Text>
            <Text style={[styles.cardValue, { color: card.tone }]}>{card.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Son 7 Gun Busy Gecisleri</Text>
      {(courier.stats?.busyTogglesLast7Days || []).map((entry: any) => (
        <View key={entry.date} style={styles.row}>
          <Text style={styles.rowLabel}>{new Date(entry.date).toLocaleDateString('tr-TR')}</Text>
          <Text style={styles.rowValue}>{entry.count}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  subtitle: { marginTop: 4, color: '#64748b', marginBottom: 14 },
  metaBox: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16, gap: 6 },
  formBox: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16 },
  meta: { color: '#334155', fontSize: 14 },
  sectionHint: { color: '#64748b', fontSize: 12, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  fieldHint: { color: '#64748b', fontSize: 12, marginTop: -4, marginBottom: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  switchLabel: { fontWeight: '600', color: '#0f172a' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  card: { width: '47%', borderRadius: 14, padding: 14 },
  cardLabel: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  row: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: '#334155' },
  rowValue: { fontWeight: '700', color: '#0f172a' },
  primaryButton: { backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  dangerButton: { backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  primaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 }
});
