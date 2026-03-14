import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { financialService } from '../../services/financialService';

export default function CourierEarningsScreen() {
  const [data, setData] = useState<{ summary: any; orders: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await financialService.getCourierEarnings();
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <Text style={styles.title}>Kazanclarim</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0f766e" style={{ marginTop: 40 }} />
      ) : !data ? (
        <Text style={styles.empty}>Veri yuklenemedi</Text>
      ) : (
        <>
          <View style={styles.grid}>
            <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
              <Text style={styles.statLabel}>Toplam Teslimat</Text>
              <Text style={[styles.statValue, { color: '#059669' }]}>{data.summary.totalOrders}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
              <Text style={styles.statLabel}>Siparis Basi Ucret</Text>
              <Text style={[styles.statValue, { color: '#2563eb' }]}>{data.summary.paymentPerOrder.toFixed(2)} ₺</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fefce8' }]}>
              <Text style={styles.statLabel}>Toplam Kazanc</Text>
              <Text style={[styles.statValue, { color: '#ca8a04' }]}>{data.summary.totalEarnings.toFixed(2)} ₺</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Son Teslimatlar</Text>
          {data.orders.length === 0 && <Text style={styles.empty}>Henuz teslimat yok</Text>}
          {data.orders.map((o: any) => (
            <View key={o.orderId} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowMain}>{o.restaurantName}</Text>
                <Text style={styles.rowSub}>{o.orderNumber}</Text>
                <Text style={styles.rowSub}>{o.deliveredAt ? new Date(o.deliveredAt).toLocaleString('tr-TR') : ''}</Text>
              </View>
              <Text style={styles.rowAmount}>+{o.earning.toFixed(2)} ₺</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 14 },
  statLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 10 },
  row: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  rowMain: { fontWeight: '600', color: '#0f172a' },
  rowSub: { fontSize: 12, color: '#64748b' },
  rowAmount: { fontSize: 16, fontWeight: '700', color: '#16a34a' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 }
});
