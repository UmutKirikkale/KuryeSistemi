import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { adminService } from '../../services/adminService';
export default function AdminRestaurantDetailScreen({ route, navigation }: any) {
  const [restaurant, setRestaurant] = useState(route.params.restaurant);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commissionPerOrder, setCommissionPerOrder] = useState(String(route.params.restaurant.commissionPerOrder || 0));
  const displayName = restaurant.name || restaurant.user?.name || 'Restoran';
  const displayEmail = restaurant.email || restaurant.user?.email || '-';
  const displayPhone = restaurant.phone || restaurant.user?.phone || '-';
  const cards = [
    { label: 'Toplam Siparis', value: String(restaurant.totalOrders || 0), tone: '#2563eb', bg: '#eff6ff' },
    { label: 'Komisyon', value: `${Number(restaurant.commissionPerOrder || 0).toFixed(2)} ₺`, tone: '#d97706', bg: '#fef3c7' },
    { label: 'Durum', value: (restaurant.user?.isActive ?? restaurant.isActive) ? 'Aktif' : 'Pasif', tone: (restaurant.user?.isActive ?? restaurant.isActive) ? '#16a34a' : '#94a3b8', bg: (restaurant.user?.isActive ?? restaurant.isActive) ? '#ecfdf5' : '#f1f5f9' }
  ];

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoadingReport(true);
        const response = await adminService.getRestaurantFinancialReport(restaurant.id, period);
        setReport(response);
      } catch {
        setReport(null);
      } finally {
        setLoadingReport(false);
      }
    };

    void loadReport();
  }, [restaurant.id, period]);

  const handleSaveCommission = async () => {
    try {
      setSaving(true);
      const response = await adminService.updateRestaurantCommission(restaurant.id, Number(commissionPerOrder || 0));
      setRestaurant((prev: any) => ({ ...prev, ...response.restaurant }));
      Alert.alert('Basarili', 'Komisyon guncellendi');
    } catch (error: any) {
      Alert.alert('Hata', error?.response?.data?.message || error?.response?.data?.error || 'Komisyon guncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Restorani Sil', 'Bu restoran kaydi silinsin mi?', [
      { text: 'Vazgec', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await adminService.deleteRestaurant(restaurant.id);
            navigation.goBack();
          } catch (error: any) {
            Alert.alert('Hata', error?.response?.data?.message || error?.response?.data?.error || 'Restoran silinemedi');
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
        <Text style={styles.meta}>Adres: {restaurant.address || '-'}</Text>
        <Text style={styles.meta}>Telefon: {displayPhone}</Text>
        <Text style={styles.meta}>Hesap Sahibi: {restaurant.user?.name || '-'}</Text>
        <Text style={styles.meta}>Kayit: {restaurant.user?.createdAt ? new Date(restaurant.user.createdAt).toLocaleDateString('tr-TR') : '-'}</Text>
      </View>

      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.label} style={[styles.card, { backgroundColor: card.bg }]}>
            <Text style={styles.cardLabel}>{card.label}</Text>
            <Text style={[styles.cardValue, { color: card.tone }]}>{card.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.formBox}>
        <Text style={styles.sectionTitle}>Restoran Ayarlari</Text>
        <Text style={styles.sectionHint}>Bu alandaki degisiklik siparis basi komisyon tutarini aninda gunceller.</Text>

        <Text style={styles.fieldLabel}>Siparis Basi Komisyon (TL)</Text>
        <TextInput style={styles.input} value={commissionPerOrder} onChangeText={setCommissionPerOrder} placeholder="Orn: 100" keyboardType="decimal-pad" />
        <Text style={styles.fieldHint}>Her teslim edilen sipariste restorandan dusecek komisyon tutari.</Text>

        <Text style={styles.fieldLabel}>Rapor Donemi</Text>
        <View style={styles.periodRow}>
          {(['daily', 'weekly', 'monthly'] as const).map((value) => (
            <Pressable key={value} style={[styles.periodChip, period === value && styles.periodChipActive]} onPress={() => setPeriod(value)}>
              <Text style={[styles.periodChipText, period === value && styles.periodChipTextActive]}>{value === 'daily' ? 'Gunluk' : value === 'weekly' ? 'Haftalik' : 'Aylik'}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={[styles.primaryButton, saving && styles.disabled]} onPress={handleSaveCommission} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Komisyon Degisikliklerini Kaydet</Text>}
        </Pressable>
        <Pressable style={[styles.dangerButton, deleting && styles.disabled]} onPress={handleDelete} disabled={deleting}>
          {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Restorani Kalici Olarak Sil</Text>}
        </Pressable>
      </View>

      <View style={styles.formBox}>
        <Text style={styles.sectionTitle}>Finansal Rapor</Text>
        <Text style={styles.sectionHint}>Secilen doneme gore restoranin ciro, komisyon ve net gelir ozetini gosterir.</Text>
        {loadingReport ? (
          <ActivityIndicator color="#1d4ed8" />
        ) : !report ? (
          <Text style={styles.meta}>Rapor yuklenemedi</Text>
        ) : (
          <>
            <Text style={styles.meta}>Toplam Siparis: {report.summary?.totalOrders || 0}</Text>
            <Text style={styles.meta}>Ciro: {Number(report.summary?.totalRevenue || 0).toFixed(2)} ₺</Text>
            <Text style={styles.meta}>Komisyon: {Number(report.summary?.totalCommission || 0).toFixed(2)} ₺</Text>
            <Text style={styles.meta}>Net Gelir: {Number(report.summary?.netIncome || 0).toFixed(2)} ₺</Text>
          </>
        )}
      </View>
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  sectionHint: { color: '#64748b', fontSize: 12, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  fieldHint: { color: '#64748b', fontSize: 12, marginTop: -4, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '47%', borderRadius: 14, padding: 14 },
  cardLabel: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: '700' },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  periodChip: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 999 },
  periodChipActive: { backgroundColor: '#dbeafe' },
  periodChipText: { color: '#475569', fontWeight: '600' },
  periodChipTextActive: { color: '#1d4ed8' },
  primaryButton: { backgroundColor: '#1d4ed8', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  dangerButton: { backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  primaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 }
});
