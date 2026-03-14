import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { financialService } from '../../services/financialService';

export default function RestaurantFinancialScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await financialService.getRestaurantFinancials();
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
      <Text style={styles.title}>Finansal Ozet</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 40 }} />
      ) : !data ? (
        <Text style={styles.empty}>Veri yuklenemedi</Text>
      ) : (
        <>
          <View style={styles.grid}>
            <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
              <Text style={styles.statLabel}>Toplam Siparis</Text>
              <Text style={[styles.statValue, { color: '#1d4ed8' }]}>{data.summary.totalOrders}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
              <Text style={styles.statLabel}>Toplam Ciro</Text>
              <Text style={[styles.statValue, { color: '#059669' }]}>{data.summary.totalAmount.toFixed(2)} ₺</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
              <Text style={styles.statLabel}>Komis. (Toplam)</Text>
              <Text style={[styles.statValue, { color: '#d97706' }]}>{data.summary.totalCommission.toFixed(2)} ₺</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fce7f3' }]}>
              <Text style={styles.statLabel}>Net Gelir</Text>
              <Text style={[styles.statValue, { color: '#9d174d' }]}>{data.summary.netRevenue.toFixed(2)} ₺</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Siparis Gecmisi</Text>
          {data.orders.length === 0 && <Text style={styles.empty}>Henuz teslim edilmis siparis yok</Text>}
          {data.orders.map((o: any) => (
            <View key={o.orderId} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowMain}>{o.orderNumber}</Text>
                <Text style={styles.rowSub}>{o.courierName ? `Kurye: ${o.courierName}` : 'Kurye atanmadi'}</Text>
                <Text style={styles.rowSub}>{o.deliveredAt ? new Date(o.deliveredAt).toLocaleString('tr-TR') : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.rowAmount}>{o.orderAmount.toFixed(2)} ₺</Text>
                <Text style={styles.rowCommission}>-{o.commission.toFixed(2)} ₺</Text>
              </View>
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
  statValue: { fontSize: 20, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 10 },
  row: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  rowMain: { fontWeight: '600', color: '#0f172a' },
  rowSub: { fontSize: 12, color: '#64748b' },
  rowAmount: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  rowCommission: { fontSize: 12, color: '#dc2626' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 }
});
