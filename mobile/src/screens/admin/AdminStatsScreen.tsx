import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminService, DashboardStats } from '../../services/adminService';
import AdminHeader from '../../components/AdminHeader';

type OrderPeriod = 'daily' | 'weekly' | 'monthly';

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderAmount: number;
  createdAt: string;
  sourcePlatform?: string;
  externalOrderId?: string;
  restaurant?: {
    name?: string;
  };
  courier?: {
    name?: string;
  };
}

export default function AdminStatsScreen({ navigation }: any) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderPeriod, setOrderPeriod] = useState<OrderPeriod>('daily');
  const [settlementPeriod, setSettlementPeriod] = useState<OrderPeriod>('daily');
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementSummary, setSettlementSummary] = useState<{ totalRecords: number; totalClosedAmount: number } | null>(null);
  const [recentSettlements, setRecentSettlements] = useState<Array<{
    id: string;
    amount: number;
    date: string;
    packageCount?: number | null;
    restaurant?: { name?: string } | null;
    courier?: { name?: string } | null;
  }>>([]);

  const getDateRangeForPeriod = (period: OrderPeriod) => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 6);
    }

    if (period === 'monthly') {
      startDate.setDate(1);
    }

    return {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10)
    };
  };

  const load = useCallback(async () => {
    try {
      const data = await adminService.getDashboardStats();
      setStats(data.stats);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadRecentOrders = useCallback(async (period: OrderPeriod) => {
    try {
      setOrdersLoading(true);
      const data = await adminService.getAllOrders({ limit: 6, period });
      setRecentOrders(data.orders || []);
    } catch {
      setRecentOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentOrders(orderPeriod);
  }, [loadRecentOrders, orderPeriod]);

  const loadRecentSettlements = useCallback(async (period: OrderPeriod) => {
    try {
      setSettlementLoading(true);
      const range = getDateRangeForPeriod(period);
      const data = await adminService.getCourierSettlementClosings({
        ...range,
        limit: 6
      });
      setSettlementSummary(data.summary || { totalRecords: 0, totalClosedAmount: 0 });
      setRecentSettlements(data.settlements || []);
    } catch {
      setSettlementSummary({ totalRecords: 0, totalClosedAmount: 0 });
      setRecentSettlements([]);
    } finally {
      setSettlementLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentSettlements(settlementPeriod);
  }, [loadRecentSettlements, settlementPeriod]);


  const tiles: { label: string; key: keyof DashboardStats; color: string; bg: string }[] = [
    { label: 'Toplam Kullanici', key: 'totalUsers', color: '#2563eb', bg: '#eff6ff' },
    { label: 'Toplam Restoran', key: 'totalRestaurants', color: '#d97706', bg: '#fefce8' },
    { label: 'Toplam Kurye', key: 'totalCouriers', color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Toplam Siparis', key: 'totalOrders', color: '#0f766e', bg: '#f0fdfa' },
    { label: 'Aktif Siparis', key: 'activeOrders', color: '#f59e0b', bg: '#fffbeb' },
    { label: 'Teslim Edildi', key: 'completedOrders', color: '#16a34a', bg: '#ecfdf5' },
    { label: 'Toplam Gelir', key: 'totalRevenue', color: '#be123c', bg: '#fff1f2' },
    { label: 'Bugun Gelir', key: 'todayRevenue', color: '#7c2d12', bg: '#ffedd5' }
  ];
  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); loadRecentOrders(orderPeriod); loadRecentSettlements(settlementPeriod); }} />}
    >
      <AdminHeader title="Admin Dashboard" subtitle="Mobil yonetim paneli" />

      <View style={styles.actionsRow}>
        <Pressable style={[styles.actionBtn, { backgroundColor: '#7c3aed' }]} onPress={() => navigation.navigate('AdminCreateCourier')}>
          <Text style={styles.actionText}>+ Yeni Kurye</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: '#1d4ed8' }]} onPress={() => navigation.navigate('AdminCreateRestaurant')}>
          <Text style={styles.actionText}>+ Yeni Restoran</Text>
        </Pressable>
      </View>

      <View style={styles.quickRow}>
        <Pressable style={styles.quickCard} onPress={() => navigation.navigate('AdminUsers')}>
          <Text style={styles.quickTitle}>Kullanicilar</Text>
          <Text style={styles.quickSub}>Hesap yonetimi</Text>
        </Pressable>
        <Pressable style={styles.quickCard} onPress={() => navigation.navigate('AdminCouriers')}>
          <Text style={styles.quickTitle}>Kuryeler</Text>
          <Text style={styles.quickSub}>Performans ve durum</Text>
        </Pressable>
        <Pressable style={styles.quickCard} onPress={() => navigation.navigate('AdminRestaurants')}>
          <Text style={styles.quickTitle}>Restoranlar</Text>
          <Text style={styles.quickSub}>Komisyon ve finans</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
      ) : !stats ? (
        <Text style={styles.empty}>Istatistikler yuklenemedi</Text>
      ) : (
        <View style={styles.grid}>
          {tiles.map((t) => (
            <View key={t.key} style={[styles.tile, { backgroundColor: t.bg }]}>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={[styles.tileValue, { color: t.color }]}>
                {String(stats[t.key])}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.ordersCard}>
        <View style={styles.ordersHeader}>
          <Text style={styles.ordersTitle}>Son Siparisler</Text>
          <View style={styles.periodRow}>
            <Pressable style={[styles.periodChip, orderPeriod === 'daily' && styles.periodChipActive]} onPress={() => setOrderPeriod('daily')}>
              <Text style={[styles.periodText, orderPeriod === 'daily' && styles.periodTextActive]}>Gunluk</Text>
            </Pressable>
            <Pressable style={[styles.periodChip, orderPeriod === 'weekly' && styles.periodChipActive]} onPress={() => setOrderPeriod('weekly')}>
              <Text style={[styles.periodText, orderPeriod === 'weekly' && styles.periodTextActive]}>Haftalik</Text>
            </Pressable>
            <Pressable style={[styles.periodChip, orderPeriod === 'monthly' && styles.periodChipActive]} onPress={() => setOrderPeriod('monthly')}>
              <Text style={[styles.periodText, orderPeriod === 'monthly' && styles.periodTextActive]}>Aylik</Text>
            </Pressable>
          </View>
        </View>

        {ordersLoading ? (
          <ActivityIndicator size="small" color="#16a34a" style={{ marginVertical: 16 }} />
        ) : recentOrders.length === 0 ? (
          <Text style={styles.ordersEmpty}>Secili donemde siparis yok</Text>
        ) : (
          <View style={styles.orderList}>
            {recentOrders.map((order) => (
              <View key={order.id} style={styles.orderItem}>
                <View>
                  <Text style={styles.orderNo}>{order.orderNumber}</Text>
                  <Text style={styles.orderMeta}>{order.restaurant?.name || 'Restoran yok'}</Text>
                  {order.courier?.name && <Text style={styles.orderMeta}>Teslim Eden Kurye: {order.courier.name}</Text>}
                  {order.sourcePlatform && <Text style={styles.orderMeta}>Platform: {order.sourcePlatform}</Text>}
                  {order.externalOrderId && <Text style={styles.orderMeta}>Platform Siparis No: {order.externalOrderId}</Text>}
                  <Text style={styles.orderMeta}>
                    {new Date(order.createdAt).toLocaleDateString('tr-TR')} {new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderAmount}>{order.orderAmount.toFixed(2)} ₺</Text>
                  <Text style={styles.orderStatus}>{order.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.ordersCard}>
        <View style={styles.ordersHeader}>
          <Text style={styles.ordersTitle}>Kurye Hesap Kapama Raporu</Text>
          <View style={styles.periodRow}>
            <Pressable style={[styles.periodChip, settlementPeriod === 'daily' && styles.periodChipActive]} onPress={() => setSettlementPeriod('daily')}>
              <Text style={[styles.periodText, settlementPeriod === 'daily' && styles.periodTextActive]}>Gunluk</Text>
            </Pressable>
            <Pressable style={[styles.periodChip, settlementPeriod === 'weekly' && styles.periodChipActive]} onPress={() => setSettlementPeriod('weekly')}>
              <Text style={[styles.periodText, settlementPeriod === 'weekly' && styles.periodTextActive]}>Haftalik</Text>
            </Pressable>
            <Pressable style={[styles.periodChip, settlementPeriod === 'monthly' && styles.periodChipActive]} onPress={() => setSettlementPeriod('monthly')}>
              <Text style={[styles.periodText, settlementPeriod === 'monthly' && styles.periodTextActive]}>Aylik</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={[styles.tile, { backgroundColor: '#eff6ff' }]}>
            <Text style={styles.tileLabel}>Kapanan Kayit</Text>
            <Text style={[styles.tileValue, { color: '#2563eb' }]}>{settlementSummary?.totalRecords || 0}</Text>
          </View>
          <View style={[styles.tile, { backgroundColor: '#ecfdf5' }]}>
            <Text style={styles.tileLabel}>Toplam Kapatilan</Text>
            <Text style={[styles.tileValue, { color: '#16a34a', fontSize: 24 }]}>{(settlementSummary?.totalClosedAmount || 0).toFixed(2)} ₺</Text>
          </View>
        </View>

        {settlementLoading ? (
          <ActivityIndicator size="small" color="#7c3aed" style={{ marginVertical: 16 }} />
        ) : recentSettlements.length === 0 ? (
          <Text style={styles.ordersEmpty}>Secili donemde hesap kapama kaydi yok</Text>
        ) : (
          <View style={styles.orderList}>
            {recentSettlements.map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <View>
                  <Text style={styles.orderNo}>{item.courier?.name || 'Kurye'}</Text>
                  <Text style={styles.orderMeta}>{item.restaurant?.name || 'Restoran yok'}</Text>
                  <Text style={styles.orderMeta}>Paket: {item.packageCount ?? '-'}</Text>
                  <Text style={styles.orderMeta}>{new Date(item.date).toLocaleDateString('tr-TR')} {new Date(item.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderAmount}>{item.amount.toFixed(2)} ₺</Text>
                  <Text style={styles.orderStatus}>Kapatildi</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  quickCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  quickTitle: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  quickSub: { color: '#64748b', fontSize: 11, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47%', borderRadius: 14, padding: 16 },
  tileLabel: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  tileValue: { fontSize: 28, fontWeight: '800' },
  ordersCard: { marginTop: 14, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginBottom: 20 },
  ordersHeader: { gap: 8, marginBottom: 8 },
  ordersTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  periodRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  periodChip: { backgroundColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  periodChipActive: { backgroundColor: '#16a34a' },
  periodText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  periodTextActive: { color: '#fff' },
  ordersEmpty: { color: '#64748b', fontSize: 13, textAlign: 'center', marginVertical: 10 },
  orderList: { gap: 8 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  orderNo: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  orderMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  orderAmount: { fontSize: 13, fontWeight: '700', color: '#0f766e' },
  orderStatus: { fontSize: 11, color: '#475569', marginTop: 2 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60 }
});
