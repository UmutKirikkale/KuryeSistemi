import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { orderService, Order } from '../../services/orderService';
import { locationService } from '../../services/locationService';

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
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [filter, setFilter] = useState<'ALL' | 'POOL' | 'MINE' | 'COMPLETED'>('ALL');
  const [query, setQuery] = useState('');

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

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filteredByTab = orders.filter((order) => {
      if (filter === 'POOL') return ['PENDING', 'APPROVED', 'PREPARING'].includes(order.status);
      if (filter === 'MINE') return order.courier?.id === user?.id;
      if (filter === 'COMPLETED') return order.status === 'DELIVERED';
      return true;
    });

    if (!normalizedQuery) return filteredByTab;

    return filteredByTab.filter((order) => {
      const haystack = `${order.orderNumber} ${order.customerName} ${order.deliveryAddress}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [orders, filter, query, user?.id]);

  const handleToggleAvailability = async () => {
    try {
      const response = await locationService.toggleAvailability();
      setIsAvailable(response.isAvailable);
    } catch {
      Alert.alert('Hata', 'Musaitlik degistirilemedi');
    }
  };

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
        <View style={styles.headerActions}>
          <Pressable style={[styles.stateBtn, isAvailable ? styles.stateAvailable : styles.stateBusy]} onPress={handleToggleAvailability}>
            <Text style={styles.stateText}>{isAvailable ? 'Musait' : 'Mesgul'}</Text>
          </Pressable>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Cikis</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#eff6ff' }]}>
          <Text style={styles.summaryLabel}>Acilan Havuz</Text>
          <Text style={[styles.summaryValue, { color: '#2563eb' }]}>{orders.filter((o) => ['PENDING', 'APPROVED', 'PREPARING'].includes(o.status)).length}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#ecfdf5' }]}>
          <Text style={styles.summaryLabel}>Bendeki Siparis</Text>
          <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{orders.filter((o) => o.courier?.id === user?.id).length}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <Pressable style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]} onPress={() => setFilter('ALL')}>
          <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>Tum</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, filter === 'POOL' && styles.filterChipActive]} onPress={() => setFilter('POOL')}>
          <Text style={[styles.filterText, filter === 'POOL' && styles.filterTextActive]}>Havuz</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, filter === 'MINE' && styles.filterChipActive]} onPress={() => setFilter('MINE')}>
          <Text style={[styles.filterText, filter === 'MINE' && styles.filterTextActive]}>Benimkiler</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, filter === 'COMPLETED' && styles.filterChipActive]} onPress={() => setFilter('COMPLETED')}>
          <Text style={[styles.filterText, filter === 'COMPLETED' && styles.filterTextActive]}>Teslim</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder="Siparis no, musteri veya adres ara"
        placeholderTextColor="#94a3b8"
        selectionColor="#0f766e"
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#0f766e" />
      ) : (
        <FlatList
          data={visibleOrders}
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
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  stateBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  stateAvailable: { backgroundColor: '#dcfce7' },
  stateBusy: { backgroundColor: '#ffedd5' },
  stateText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  logoutBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#475569', fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 12 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12 },
  summaryLabel: { fontSize: 12, color: '#64748b' },
  summaryValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, marginTop: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#0f766e' },
  filterText: { color: '#334155', fontWeight: '600', fontSize: 12 },
  filterTextActive: { color: '#fff' },
  searchInput: { marginHorizontal: 12, marginTop: 10, marginBottom: 2, backgroundColor: '#fff', color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
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
