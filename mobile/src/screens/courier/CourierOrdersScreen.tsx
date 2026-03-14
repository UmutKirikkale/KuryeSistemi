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

export default function CourierOrdersScreen() {
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

  const handleAssign = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await orderService.assignOrder(orderId);
      await loadOrders();
    } catch {
      Alert.alert('Hata', 'Siparis alinamadi');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatus = async (orderId: string, status: string) => {
    if (status === 'DELIVERED') {
      Alert.alert('Odeme Yontemi', 'Musterinin odeme yontemini secin', [
        { text: 'Nakit', onPress: () => doStatusUpdate(orderId, status, 'CASH') },
        { text: 'Kart', onPress: () => doStatusUpdate(orderId, status, 'CARD') },
        { text: 'Iptal', style: 'cancel' }
      ]);
    } else {
      doStatusUpdate(orderId, status);
    }
  };

  const doStatusUpdate = async (
    orderId: string,
    status: string,
    paymentMethod?: 'CASH' | 'CARD'
  ) => {
    setActionLoading(orderId);
    try {
      await orderService.updateOrderStatus(orderId, status, paymentMethod);
      await loadOrders();
    } catch {
      Alert.alert('Hata', 'Durum guncellenemedi');
    } finally {
      setActionLoading(null);
    }
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const isMine = item.courier?.id === user?.id;
    const canAssign = ['PENDING', 'APPROVED', 'PREPARING'].includes(item.status);
    const canPickup = isMine && item.status === 'ASSIGNED';
    const canDeliver = isMine && item.status === 'PICKED_UP';
    const isActioning = actionLoading === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderNo}>{item.orderNumber}</Text>
          <Text style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>

        <Text style={styles.label}>Alış: <Text style={styles.value}>{item.pickupAddress}</Text></Text>
        <Text style={styles.label}>Teslimat: <Text style={styles.value}>{item.deliveryAddress}</Text></Text>
        <Text style={styles.label}>Musteri: <Text style={styles.value}>{item.customerName}</Text></Text>
        <Text style={styles.label}>Tutar: <Text style={styles.value}>{item.orderAmount.toFixed(2)} ₺</Text></Text>

        <View style={styles.actions}>
          {canAssign && (
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => handleAssign(item.id)}
              disabled={isActioning}
            >
              {isActioning ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>Siparisi Al</Text>
              )}
            </Pressable>
          )}
          {canPickup && (
            <Pressable
              style={[styles.btn, styles.btnWarning]}
              onPress={() => handleStatus(item.id, 'PICKED_UP')}
              disabled={isActioning}
            >
              {isActioning ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>Teslim Aldim</Text>
              )}
            </Pressable>
          )}
          {canDeliver && (
            <Pressable
              style={[styles.btn, styles.btnSuccess]}
              onPress={() => handleStatus(item.id, 'DELIVERED')}
              disabled={isActioning}
            >
              {isActioning ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>Teslim Ettim</Text>
              )}
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
          <Text style={styles.title}>Kurye Paneli</Text>
          <Text style={styles.sub}>Hos geldin, {user?.name}</Text>
        </View>
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Cikis</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#0f766e" />
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
  btnPrimary: { backgroundColor: '#0f766e' },
  btnWarning: { backgroundColor: '#d97706' },
  btnSuccess: { backgroundColor: '#16a34a' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 14 }
});
