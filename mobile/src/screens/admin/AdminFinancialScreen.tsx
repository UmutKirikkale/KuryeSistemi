import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { adminService } from '../../services/adminService';
import AdminHeader from '../../components/AdminHeader';

type Period = 'daily' | 'weekly' | 'monthly';

interface Restaurant {
  id: string;
  name: string;
  commissionPerOrder: number;
  user: { name: string; email: string };
}

interface FinancialSummary {
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  netIncome: number;
}

interface DailyStat {
  date: string;
  orderCount: number;
  revenue: number;
  commission: number;
  netIncome: number;
}

interface FinancialReport {
  restaurant: { name: string; commissionPerOrder: number };
  period: string;
  summary: FinancialSummary;
  dailyStats: DailyStat[];
}

const PERIOD_LABELS: Record<Period, string> = { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık' };

const fmt = (n: number) => `₺${Number(n ?? 0).toFixed(2)}`;

export default function AdminFinancialScreen() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [period, setPeriod] = useState<Period>('daily');
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchRestaurants = useCallback(async () => {
    try {
      const data = await adminService.getAllRestaurants();
      setRestaurants(data.restaurants ?? data ?? []);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.error || 'Restoranlar yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  const fetchReport = useCallback(async (restaurant: Restaurant, p: Period) => {
    setReportLoading(true);
    setReport(null);
    try {
      const data = await adminService.getRestaurantFinancialReport(restaurant.id, p);
      setReport(data.report ?? data);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.error || 'Rapor yüklenemedi');
    } finally {
      setReportLoading(false);
    }
  }, []);

  const handleSelectRestaurant = (r: Restaurant) => {
    setSelected(r);
    fetchReport(r, period);
  };

  const handlePeriod = (p: Period) => {
    setPeriod(p);
    if (selected) fetchReport(selected, p);
  };

  const handleRefresh = () => { setRefreshing(true); fetchRestaurants(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <AdminHeader title="Finansal Raporlar" />

      {/* Restaurant list */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Restoran Seç</Text>
        {restaurants.map(r => (
          <Pressable
            key={r.id}
            style={[styles.restItem, selected?.id === r.id && styles.restItemActive]}
            onPress={() => handleSelectRestaurant(r)}
          >
            <Text style={[styles.restName, selected?.id === r.id && styles.restNameActive]}>{r.name}</Text>
            <Text style={styles.restMeta}>Komisyon: {r.commissionPerOrder}₺/sipariş</Text>
          </Pressable>
        ))}
      </View>

      {selected && (
        <>
          {/* Period selector */}
          <View style={styles.periodRow}>
            {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
              <Pressable
                key={p}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                onPress={() => handlePeriod(p)}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                  {PERIOD_LABELS[p]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Report */}
          {reportLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#7c3aed" />
            </View>
          ) : report ? (
            <>
              {/* Summary */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{selected.name} — {PERIOD_LABELS[period]} Özet</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Sipariş</Text>
                    <Text style={styles.statValue}>{report.summary.totalOrders}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Ciro</Text>
                    <Text style={[styles.statValue, { color: '#2563eb' }]}>{fmt(report.summary.totalRevenue)}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Komisyon</Text>
                    <Text style={[styles.statValue, { color: '#7c3aed' }]}>{fmt(report.summary.totalCommission)}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Net Gelir</Text>
                    <Text style={[styles.statValue, { color: '#16a34a' }]}>{fmt(report.summary.netIncome)}</Text>
                  </View>
                </View>
              </View>

              {/* Daily stats */}
              {report.dailyStats && report.dailyStats.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Günlük Detay</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Tarih</Text>
                    <Text style={styles.tableCell}>Sipariş</Text>
                    <Text style={styles.tableCell}>Ciro</Text>
                    <Text style={styles.tableCell}>Komisyon</Text>
                  </View>
                  {report.dailyStats.map((d, i) => (
                    <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                      <Text style={[styles.tableCell, { flex: 2, color: '#374151' }]}>
                        {d.date?.slice(0, 10) ?? '-'}
                      </Text>
                      <Text style={styles.tableCell}>{d.orderCount}</Text>
                      <Text style={styles.tableCell}>{fmt(d.revenue)}</Text>
                      <Text style={styles.tableCell}>{fmt(d.commission)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  restItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  restItemActive: { borderColor: '#7c3aed', backgroundColor: '#faf5ff' },
  restName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  restNameActive: { color: '#7c3aed' },
  restMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  periodRow: { flexDirection: 'row', margin: 16, marginBottom: 0, gap: 8 },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  periodBtnActive: { borderColor: '#7c3aed', backgroundColor: '#7c3aed' },
  periodText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f5f3ff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 4,
  },
  tableRow: { flexDirection: 'row', paddingVertical: 6 },
  tableRowAlt: { backgroundColor: '#f9fafb' },
  tableCell: { flex: 1, fontSize: 12, color: '#6b7280', textAlign: 'center' },
});
