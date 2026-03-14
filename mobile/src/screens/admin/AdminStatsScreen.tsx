import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminService, DashboardStats } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';

export default function AdminStatsScreen() {
  const { logout } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminService.getDashboardStats();
      setStats(data);
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
    { label: 'Bekleyen Siparis', key: 'pendingOrders', color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Teslim Edildi', key: 'deliveredOrders', color: '#16a34a', bg: '#ecfdf5' }
  ];

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
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
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47%', borderRadius: 14, padding: 16 },
  tileLabel: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  tileValue: { fontSize: 28, fontWeight: '800' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60 }
});
