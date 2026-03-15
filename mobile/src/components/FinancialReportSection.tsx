import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { financialService } from '../services/financialService';

type Mode = 'daily' | 'monthly';

const fmt = (n: number) => `₺${Number(n ?? 0).toFixed(2)}`;

export default function FinancialReportScreen({ role }: { role: 'RESTAURANT' | 'COURIER' }) {
  const [mode, setMode] = useState<Mode>('daily');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<any>(null);

  // daily params
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  // monthly params
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setReport(null);
    try {
      if (mode === 'daily') {
        const data = await financialService.getDailyReport(date);
        setReport(data.report);
      } else {
        const data = await financialService.getMonthlyReport(Number(year), Number(month));
        setReport(data.report);
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.error || 'Rapor yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, date, year, month]);

  useEffect(() => { fetchReport(); }, []);

  const handleRefresh = () => { setRefreshing(true); fetchReport(); };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Mode selector */}
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeBtn, mode === 'daily' && styles.modeBtnActive]}
          onPress={() => setMode('daily')}
        >
          <Text style={[styles.modeBtnText, mode === 'daily' && styles.modeBtnTextActive]}>Günlük</Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, mode === 'monthly' && styles.modeBtnActive]}
          onPress={() => setMode('monthly')}
        >
          <Text style={[styles.modeBtnText, mode === 'monthly' && styles.modeBtnTextActive]}>Aylık</Text>
        </Pressable>
      </View>

      {/* Params */}
      <View style={styles.card}>
        {mode === 'daily' ? (
          <>
            <Text style={styles.label}>Tarih (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="2026-03-15"
            />
          </>
        ) : (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Yıl</Text>
              <TextInput style={styles.input} value={year} onChangeText={setYear} keyboardType="numeric" placeholder="2026" />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Ay (1-12)</Text>
              <TextInput style={styles.input} value={month} onChangeText={setMonth} keyboardType="numeric" placeholder="3" />
            </View>
          </View>
        )}
        <Pressable style={styles.fetchBtn} onPress={fetchReport}>
          <Text style={styles.fetchBtnText}>Raporu Getir</Text>
        </Pressable>
      </View>

      {/* Report */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : report ? (
        <View style={styles.card}>
          {role === 'RESTAURANT' ? (
            <>
              <Text style={styles.sectionTitle}>
                {mode === 'daily'
                  ? `📅 ${String(report.date ?? date).slice(0, 10)}`
                  : `📅 ${report.period}`}
              </Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Toplam Sipariş</Text>
                  <Text style={styles.statValue}>{report.totalOrders}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Tamamlanan</Text>
                  <Text style={[styles.statValue, { color: '#16a34a' }]}>{report.completedOrders}</Text>
                </View>
                {mode === 'daily' && (
                  <>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Bekleyen</Text>
                      <Text style={[styles.statValue, { color: '#d97706' }]}>{report.pendingOrders}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>İptal</Text>
                      <Text style={[styles.statValue, { color: '#dc2626' }]}>{report.cancelledOrders}</Text>
                    </View>
                  </>
                )}
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Brüt Kazanç</Text>
                  <Text style={[styles.statValue, { color: '#2563eb' }]}>{fmt(report.grossEarnings)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Komisyon</Text>
                  <Text style={[styles.statValue, { color: '#7c3aed' }]}>{fmt(report.commissions)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Kurye Ücreti</Text>
                  <Text style={[styles.statValue, { color: '#ea580c' }]}>{fmt(report.courierFees)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Net Kazanç</Text>
                  <Text style={[styles.statValue, { color: '#16a34a', fontSize: 18 }]}>{fmt(report.netEarnings)}</Text>
                </View>
              </View>
            </>
          ) : (
            // Courier
            <>
              <Text style={styles.sectionTitle}>
                {mode === 'daily'
                  ? `📅 ${String(report.date ?? date).slice(0, 10)}`
                  : `📅 ${report.period}`}
              </Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Teslimat</Text>
                  <Text style={styles.statValue}>{report.totalDeliveries}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Toplam Kazanç</Text>
                  <Text style={[styles.statValue, { color: '#16a34a' }]}>{fmt(report.totalEarnings)}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Ortalama/Teslimat</Text>
                  <Text style={[styles.statValue, { color: '#2563eb' }]}>{fmt(report.averageEarningPerDelivery)}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { padding: 32, alignItems: 'center' },
  modeRow: { flexDirection: 'row', margin: 16, marginBottom: 0, gap: 8 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modeBtnActive: { borderColor: '#1d4ed8', backgroundColor: '#1d4ed8' },
  modeBtnText: { fontWeight: '600', color: '#374151', fontSize: 14 },
  modeBtnTextActive: { color: '#fff' },
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
  row: { flexDirection: 'row' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    marginBottom: 4,
  },
  fetchBtn: {
    marginTop: 10,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  fetchBtnText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4, textAlign: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
});
