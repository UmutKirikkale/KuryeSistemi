import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { adminService } from '../../services/adminService';

type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  orderAmount: number;
  createdAt: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: 'CASH' | 'CARD';
  sourcePlatform?: string;
  externalOrderId?: string;
  restaurant?: {
    name?: string;
  };
};

export default function AdminOrderHistoryScreen() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadOrders = useCallback(async (nextPage = 1) => {
    try {
      const data = await adminService.getAllOrders({ page: nextPage, limit: 25 });
      setOrders((data.orders || []) as AdminOrder[]);
      setPage(data.pagination?.page || nextPage);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  const renderOrder = ({ item }: { item: AdminOrder }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.orderNo}>{item.orderNumber}</Text>
        <Text style={styles.amount}>{item.orderAmount.toFixed(2)} TL</Text>
      </View>

      <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
      <Text style={styles.line}>Restoran: <Text style={styles.value}>{item.restaurant?.name || '-'}</Text></Text>
      <Text style={styles.line}>Durum: <Text style={styles.value}>{item.status}</Text></Text>
      <Text style={styles.line}>Musteri: <Text style={styles.value}>{item.customerName || '-'} {item.customerPhone ? `(${item.customerPhone})` : ''}</Text></Text>
      <Text style={styles.line}>Alis Adresi: <Text style={styles.value}>{item.pickupAddress || '-'}</Text></Text>
      <Text style={styles.line}>Teslimat Adresi: <Text style={styles.value}>{item.deliveryAddress || '-'}</Text></Text>
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
        <Text style={styles.sub}>Acilistan bugune {total} siparis</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#7c3aed" />
      ) : (
        <FlatList
          data={orders}
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
  list: { padding: 12, gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderNo: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  amount: { fontSize: 14, fontWeight: '700', color: '#7c3aed' },
  meta: { fontSize: 11, color: '#64748b', marginBottom: 6 },
  line: { fontSize: 12, color: '#64748b', marginBottom: 3 },
  value: { color: '#0f172a', fontWeight: '500' },
  empty: { textAlign: 'center', marginTop: 50, color: '#94a3b8' },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  pageBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  pageText: { color: '#475569', fontSize: 12, fontWeight: '600' }
});