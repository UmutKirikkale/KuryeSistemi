import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { orderService, Order } from '../../services/orderService';

export default function RestaurantOrderHistoryScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DELIVERED' | 'CANCELLED'>('ALL');
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'FEEDME' | 'YEMEKSEPETI'>('ALL');

  const loadOrders = useCallback(async (nextPage = 1) => {
    try {
      const data = await orderService.getOrders({ page: nextPage, limit: 25 });
      setOrders(data.orders || []);
      setPage(data.pagination?.page || nextPage);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders.filter((order) => {
      const statusOk = statusFilter === 'ALL' || order.status === statusFilter;
      const platformOk = platformFilter === 'ALL' || (order.sourcePlatform || '') === platformFilter;
      if (!statusOk || !platformOk) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${order.orderNumber} ${order.customerName} ${order.customerPhone} ${order.pickupAddress} ${order.deliveryAddress} ${order.sourcePlatform || ''} ${order.externalOrderId || ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [orders, platformFilter, query, statusFilter]);

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.orderNo}>{item.orderNumber}</Text>
        <Text style={styles.amount}>{item.orderAmount.toFixed(2)} TL</Text>
      </View>

      <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
      <Text style={styles.line}>Durum: <Text style={styles.value}>{item.status}</Text></Text>
      <Text style={styles.line}>Musteri: <Text style={styles.value}>{item.customerName} ({item.customerPhone})</Text></Text>
      <Text style={styles.line}>Alis Adresi: <Text style={styles.value}>{item.pickupAddress}</Text></Text>
      <Text style={styles.line}>Teslimat Adresi: <Text style={styles.value}>{item.deliveryAddress}</Text></Text>
      {item.sourcePlatform ? (
        <Text style={styles.line}>Platform: <Text style={styles.value}>{item.sourcePlatform}{item.externalOrderId ? ` (${item.externalOrderId})` : ''}</Text></Text>
      ) : null}
      {item.paymentMethod ? (
        <Text style={styles.line}>Odeme: <Text style={styles.value}>{item.paymentMethod === 'CARD' ? 'Kart' : 'Nakit'}</Text></Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Tum Siparis Gecmisi</Text>
        <Text style={styles.sub}>{total} siparis</Text>
      </View>

      <View style={styles.filterWrap}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Siparis no, musteri, adres ara"
          placeholderTextColor="#94a3b8"
        />
        <View style={styles.chipRow}>
          <Pressable style={[styles.chip, statusFilter === 'ALL' && styles.chipActive]} onPress={() => setStatusFilter('ALL')}><Text style={[styles.chipText, statusFilter === 'ALL' && styles.chipTextActive]}>Tum</Text></Pressable>
          <Pressable style={[styles.chip, statusFilter === 'PENDING' && styles.chipActive]} onPress={() => setStatusFilter('PENDING')}><Text style={[styles.chipText, statusFilter === 'PENDING' && styles.chipTextActive]}>Bekliyor</Text></Pressable>
          <Pressable style={[styles.chip, statusFilter === 'DELIVERED' && styles.chipActive]} onPress={() => setStatusFilter('DELIVERED')}><Text style={[styles.chipText, statusFilter === 'DELIVERED' && styles.chipTextActive]}>Teslim</Text></Pressable>
          <Pressable style={[styles.chip, statusFilter === 'CANCELLED' && styles.chipActive]} onPress={() => setStatusFilter('CANCELLED')}><Text style={[styles.chipText, statusFilter === 'CANCELLED' && styles.chipTextActive]}>Iptal</Text></Pressable>
        </View>
        <View style={styles.chipRow}>
          <Pressable style={[styles.chip, platformFilter === 'ALL' && styles.chipActive]} onPress={() => setPlatformFilter('ALL')}><Text style={[styles.chipText, platformFilter === 'ALL' && styles.chipTextActive]}>Tum Platformlar</Text></Pressable>
          <Pressable style={[styles.chip, platformFilter === 'FEEDME' && styles.chipActive]} onPress={() => setPlatformFilter('FEEDME')}><Text style={[styles.chipText, platformFilter === 'FEEDME' && styles.chipTextActive]}>Feedme</Text></Pressable>
          <Pressable style={[styles.chip, platformFilter === 'YEMEKSEPETI' && styles.chipActive]} onPress={() => setPlatformFilter('YEMEKSEPETI')}><Text style={[styles.chipText, platformFilter === 'YEMEKSEPETI' && styles.chipTextActive]}>Yemeksepeti</Text></Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1d4ed8" />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(page); }} />}
          ListEmptyComponent={<Text style={styles.empty}>Siparis kaydi bulunamadi</Text>}
          ListFooterComponent={
            <View style={styles.paginationRow}>
              <Pressable
                onPress={() => loadOrders(page - 1)}
                disabled={page <= 1}
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              >
                <Text style={styles.pageBtnText}>Onceki</Text>
              </Pressable>
              <Text style={styles.pageText}>Sayfa {page}/{totalPages}</Text>
              <Pressable
                onPress={() => loadOrders(page + 1)}
                disabled={page >= totalPages}
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
              >
                <Text style={styles.pageBtnText}>Sonraki</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  topBar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  sub: { marginTop: 2, fontSize: 12, color: '#64748b' },
  filterWrap: { paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#e2e8f0', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: '#1d4ed8' },
  chipText: { color: '#334155', fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  list: { padding: 12, gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderNo: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  amount: { fontSize: 14, fontWeight: '700', color: '#0f766e' },
  meta: { fontSize: 11, color: '#64748b', marginBottom: 6 },
  line: { fontSize: 12, color: '#64748b', marginBottom: 3 },
  value: { color: '#0f172a', fontWeight: '500' },
  empty: { textAlign: 'center', marginTop: 50, color: '#94a3b8' },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  pageBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  pageText: { color: '#475569', fontSize: 12, fontWeight: '600' }
});