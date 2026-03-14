import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminService, DashboardStats } from '../../services/adminService';
import AdminHeader from '../../components/AdminHeader';

export default function AdminStatsScreen({ navigation }: any) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminService.getDashboardStats();
      setStats(data.stats);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tiles: { label: string; key: keyof DashboardStats; color: string; bg: string }[] = [
    { label: 'Toplam Kullanici', key: 'totalUsers', color: '#2563eb', bg: '#eff6ff' },
    { label: 'Toplam Restoran', key: 'totalRestaurants', color: '#d97706', bg: '#fefce8' },
    { label: 'Toplam Kurye', key: 'totalCouriers', color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Toplam Siparis', key: 'totalOrders', color: '#0f766e', bg: '#f0fdfa' },
    { label: 'Aktif Siparis', key: 'activeOrders', color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Teslim Edildi', key: 'completedOrders', color: '#16a34a', bg: '#ecfdf5' },
    { label: 'Toplam Gelir', key: 'totalRevenue', color: '#be123c', bg: '#fff1f2' },
    { label: 'Bugun Gelir', key: 'todayRevenue', color: '#7c2d12', bg: '#ffedd5' }
  ];

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <AdminHeader title="Admin Dashboard" subtitle="Mobil yonetim paneli" />

      <View style={styles.actionsRow}>
        <Pressable style={[styles.actionBtn, { backgroundColor: '#7c3aed' }]} onPress={() => navigation.navigate('AdminCreateCourier')}>
          <Text style={styles.actionText}>+ Yeni Kurye</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: '#1d4ed8' }]} onPress={() => navigation.navigate('AdminCreateRestaurant')}>
          <Text style={styles.actionText}>+ Yeni Restoran</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
      ) : !stats ? (
        <Text style={styles.empty}>Istatistikler yuklenemedi</Text>
      ) : (
        <View style={styles.grid}>
          {tiles.map((t) => (
            <View key={t.key} style={[styles.tile, { backgroundColor: t.bg }]}>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={[styles.tileValue, { color: t.color }]}>
                {String(stats[t.key])}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47%', borderRadius: 14, padding: 16 },
  tileLabel: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  tileValue: { fontSize: 28, fontWeight: '800' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60 }
});
