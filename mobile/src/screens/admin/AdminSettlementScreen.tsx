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
  TextInput,
  View
} from 'react-native';
import { adminService } from '../../services/adminService';
import AdminHeader from '../../components/AdminHeader';

interface SettlementItem {
  id: string;
  amount: number;
  date: string;
  dayKey?: string | null;
  packageCount?: number | null;
  restaurant?: { id: string; name: string } | null;
  courier?: { id: string; name: string; email: string } | null;
}

interface SettlementReport {
  summary: {
    totalRecords: number;
    totalClosedAmount: number;
    startDate?: string | null;
    endDate?: string | null;
  };
  settlements: SettlementItem[];
}

const fmt = (n: number) => `₺${Number(n ?? 0).toFixed(2)}`;

export default function AdminSettlementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<SettlementReport | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchReport = useCallback(async (start: string, end: string) => {
    try {
      const data = await adminService.getCourierSettlementClosings({ startDate: start, endDate: end, limit: 100 });
      setReport(data);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.error || 'Rapor yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReport(startDate, endDate); }, []);

  const handleFilter = () => fetchReport(startDate, endDate);
  const handleRefresh = () => { setRefreshing(true); fetchReport(startDate, endDate); };

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
      <AdminHeader title="Mutabakat Kapanış Raporu" />

      {/* Date filter */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tarih Filtresi</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Başlangıç</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={styles.dateGap} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Bitiş</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>
        <Pressable style={styles.filterBtn} onPress={handleFilter}>
          <Text style={styles.filterBtnText}>Filtrele</Text>
        </Pressable>
      </View>

      {/* Summary */}
      {report && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Özet</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Kayıt Sayısı</Text>
              <Text style={styles.statValue}>{report.summary.totalRecords}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Toplam Kapalı</Text>
              <Text style={[styles.statValue, { color: '#7c3aed' }]}>{fmt(report.summary.totalClosedAmount)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Settlements list */}
      {report && report.settlements.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mutabakatlar</Text>
          {report.settlements.map((s) => (
            <View key={s.id} style={styles.settlementItem}>
              <View style={styles.settlementRow}>
                <Text style={styles.courierName}>{s.courier?.name ?? '-'}</Text>
                <Text style={styles.amount}>{fmt(s.amount)}</Text>
              </View>
              <Text style={styles.meta}>
                {s.restaurant?.name ? `Restoran: ${s.restaurant.name}` : 'Tüm Restoranlar'}
              </Text>
              <Text style={styles.meta}>
                Tarih: {s.dayKey ?? s.date?.slice(0, 10) ?? '-'}
                {s.packageCount != null ? `  ·  ${s.packageCount} paket` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {report && report.settlements.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Bu tarih aralığında mutabakat bulunamadı</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  dateGap: { width: 10 },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9fafb',
  },
  filterBtn: {
    marginTop: 12,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  filterBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: '#f5f3ff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  settlementItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 10,
  },
  settlementRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courierName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  amount: { fontSize: 14, fontWeight: '700', color: '#7c3aed' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  empty: { margin: 16, alignItems: 'center', padding: 32 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
});
