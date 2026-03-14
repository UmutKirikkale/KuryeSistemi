import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { financialService } from '../../services/financialService';

export default function RestaurantFinancialScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'COMMISSION'>('ALL');
  const [query, setQuery] = useState('');

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

  const transactions = data?.transactions || [];
  const summary = {
    transactionCount: Number(data?.summary?.transactionCount || 0),
    totalEarnings: Number(data?.summary?.totalEarnings || 0),
    totalCommissions: Number(data?.summary?.totalCommissions || 0),
    netBalance: Number(data?.summary?.netBalance || 0)
  };

  const visibleTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const byType = transactions.filter((transaction: any) => {
      if (filter === 'INCOME') return Number(transaction.amount || 0) >= 0;
      if (filter === 'COMMISSION') return Number(transaction.amount || 0) < 0 || String(transaction.transactionType || '').toLowerCase().includes('commission');
      return true;
    });

    if (!normalizedQuery) return byType;

    return byType.filter((transaction: any) => {
      const haystack = `${transaction.order?.orderNumber || ''} ${transaction.description || ''} ${transaction.transactionType || ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [transactions, filter, query]);

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
              <Text style={styles.statLabel}>Toplam Islem</Text>
              <Text style={[styles.statValue, { color: '#1d4ed8' }]}>{summary.transactionCount}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
              <Text style={styles.statLabel}>Toplam Ciro</Text>
              <Text style={[styles.statValue, { color: '#059669' }]}>{summary.totalEarnings.toFixed(2)} ₺</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
              <Text style={styles.statLabel}>Komis. (Toplam)</Text>
              <Text style={[styles.statValue, { color: '#d97706' }]}>{summary.totalCommissions.toFixed(2)} ₺</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fce7f3' }]}>
              <Text style={styles.statLabel}>Net Gelir</Text>
              <Text style={[styles.statValue, { color: '#9d174d' }]}>{summary.netBalance.toFixed(2)} ₺</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Islem Gecmisi</Text>
          <View style={styles.filterRow}>
            <Pressable style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]} onPress={() => setFilter('ALL')}>
              <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>Tum</Text>
            </Pressable>
            <Pressable style={[styles.filterChip, filter === 'INCOME' && styles.filterChipActive]} onPress={() => setFilter('INCOME')}>
              <Text style={[styles.filterText, filter === 'INCOME' && styles.filterTextActive]}>Gelir</Text>
            </Pressable>
            <Pressable style={[styles.filterChip, filter === 'COMMISSION' && styles.filterChipActive]} onPress={() => setFilter('COMMISSION')}>
              <Text style={[styles.filterText, filter === 'COMMISSION' && styles.filterTextActive]}>Komisyon</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Siparis no, aciklama veya tur ara"
            placeholderTextColor="#94a3b8"
            selectionColor="#1d4ed8"
            value={query}
            onChangeText={setQuery}
          />
          {visibleTransactions.length === 0 && <Text style={styles.empty}>Filtreye uygun finansal islem yok</Text>}
          {visibleTransactions.map((transaction: any) => (
            <View key={transaction.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowMain}>{transaction.order?.orderNumber || transaction.transactionType}</Text>
                <Text style={styles.rowSub}>{transaction.description || 'Aciklama yok'}</Text>
                <Text style={styles.rowSub}>{transaction.date ? new Date(transaction.date).toLocaleString('tr-TR') : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.rowAmount}>{Number(transaction.amount || 0).toFixed(2)} ₺</Text>
                <Text style={styles.rowCommission}>{transaction.transactionType}</Text>
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
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterChip: { backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  filterChipActive: { backgroundColor: '#1d4ed8' },
  filterText: { color: '#334155', fontWeight: '600', fontSize: 12 },
  filterTextActive: { color: '#fff' },
  searchInput: { backgroundColor: '#fff', color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  row: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  rowMain: { fontWeight: '600', color: '#0f172a' },
  rowSub: { fontSize: 12, color: '#64748b' },
  rowAmount: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  rowCommission: { fontSize: 12, color: '#dc2626' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 }
});
