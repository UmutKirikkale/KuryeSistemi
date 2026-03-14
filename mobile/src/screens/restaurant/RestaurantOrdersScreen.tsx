import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { orderService, Order } from '../../services/orderService';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor',
  APPROVED: 'Onaylandi',
  PREPARING: 'Hazirlaniyor',
  ASSIGNED: 'Atandi',
  PICKED_UP: 'Yolda',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'Iptal'
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#d97706',
  PREPARING: '#ea580c',
  ASSIGNED: '#2563eb',
  PICKED_UP: '#7c3aed',
  DELIVERED: '#16a34a',
  CANCELLED: '#dc2626'
};

const NEXT_STATUS: Record<string, { label: string; value: string } | null> = {
  PENDING: { label: 'Onayla', value: 'APPROVED' },
  APPROVED: { label: 'Hazirlamaya Basla', value: 'PREPARING' },
  PREPARING: null,
  ASSIGNED: null,
  PICKED_UP: null,
  DELIVERED: null,
  CANCELLED: null
};

export default function RestaurantOrdersScreen() {
  const { user, logout } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const data = await orderService.getOrders({ limit: 50 });
      setOrders(data.orders);
    } catch {
      Alert.alert('Hata', 'Siparisler yuklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleCancel = (orderId: string) => {
    Alert.alert('Siparisi Iptal Et', 'Bu siparisi iptal etmek istediginizden emin misiniz?', [
      { text: 'Evet', style: 'destructive', onPress: () => doStatus(orderId, 'CANCELLED') },
      { text: 'Vazgec', style: 'cancel' }
    ]);
  };

  const doStatus = async (orderId: string, status: string) => {
    setActionLoading(orderId);
    try {
      await orderService.updateOrderStatus(orderId, status);
      await loadOrders();
    } catch {
      Alert.alert('Hata', 'Durum guncellenemedi');
    } finally {
      setActionLoading(null);
    }
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const next = NEXT_STATUS[item.status];
    const isActioning = actionLoading === item.id;
    const canCancel = ['PENDING', 'APPROVED', 'PREPARING'].includes(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderNo}>{item.orderNumber}</Text>
          <Text style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>

        <Text style={styles.label}>Musteri: <Text style={styles.value}>{item.customerName}</Text></Text>
        <Text style={styles.label}>Teslimat: <Text style={styles.value}>{item.deliveryAddress}</Text></Text>
        <Text style={styles.label}>Tutar: <Text style={styles.value}>{item.orderAmount.toFixed(2)} ₺</Text></Text>
        {item.courier && (
          <Text style={styles.label}>Kurye: <Text style={styles.value}>{item.courier.name}</Text></Text>
        )}

        <View style={styles.actions}>
          {next && (
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => doStatus(item.id, next.value)}
              disabled={isActioning}
            >
              {isActioning ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>{next.label}</Text>
              )}
            </Pressable>
          )}
          {canCancel && (
            <Pressable
              style={[styles.btn, styles.btnDanger]}
              onPress={() => handleCancel(item.id)}
              disabled={isActioning}
            >
              <Text style={styles.btnText}>Iptal</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Siparisler</Text>
          <Text style={styles.sub}>{user?.name}</Text>
        </View>
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Cikis</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1d4ed8" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          renderItem={renderOrder}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Siparis bulunamadi</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  sub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  logoutBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#475569', fontSize: 13 },
  list: { padding: 12, gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNo: { fontWeight: '700', fontSize: 14, color: '#0f172a' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, color: '#fff', fontSize: 11, fontWeight: '600' },
  label: { fontSize: 12, color: '#64748b', marginBottom: 3 },
  value: { color: '#0f172a', fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#1d4ed8' },
  btnDanger: { backgroundColor: '#b91c1c', maxWidth: 80 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 14 }
});
