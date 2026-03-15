import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { financialService } from '../../services/financialService';

export default function CourierEarningsScreen() {
  const [data, setData] = useState<{ summary: any; orders: any[] } | null>(null);
  const [settlement, setSettlement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earningsDate, setEarningsDate] = useState(new Date().toISOString().slice(0, 10));
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().slice(0, 10));
  const [closing, setClosing] = useState(false);
  const [deliveryQuery, setDeliveryQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const [earningsRes, settlementRes] = await Promise.all([
        financialService.getCourierEarnings(earningsDate),
        financialService.getCourierSettlement(settlementDate)
      ]);
      setData(earningsRes);
      setSettlement(settlementRes.report);
    } catch {
      setData(null);
      setSettlement(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [earningsDate, settlementDate]);

  useEffect(() => { load(); }, [load]);

  const handleCloseSettlement = async () => {
    try {
      setClosing(true);
      const response = await financialService.closeCourierSettlement(settlementDate);
      setSettlement(response.report);
      Alert.alert('Basarili', response.message || 'Gun sonu hesap kapatildi');
    } catch {
      Alert.alert('Hata', 'Hesap kapama basarisiz oldu');
    } finally {
      setClosing(false);
    }
  };

  const handleCloseRestaurantSettlement = async (restaurantId: string) => {
    try {
      setClosing(true);
      const response = await financialService.closeCourierSettlementForRestaurant(restaurantId, settlementDate);
      setSettlement(response.report);
      Alert.alert('Basarili', response.message || 'Restoran hesabi kapatildi');
    } catch {
      Alert.alert('Hata', 'Restoran hesabi kapatma basarisiz oldu');
    } finally {
      setClosing(false);
    }
  };

  const handleReopenRestaurantSettlement = async (restaurantId: string) => {
    try {
      setClosing(true);
      const response = await financialService.reopenCourierSettlementForRestaurant(restaurantId, settlementDate);
      setSettlement(response.report);
      Alert.alert('Basarili', response.message || 'Restoran hesabi yeniden acildi');
    } catch {
      Alert.alert('Hata', 'Restoran hesabi acma basarisiz oldu');
    } finally {
      setClosing(false);
    }
  };

  const visibleDeliveries = useMemo(() => {
    if (!data?.orders) return [];
    const normalizedQuery = deliveryQuery.trim().toLowerCase();
    if (!normalizedQuery) return data.orders;
    return data.orders.filter((item: any) => {
      const haystack = `${item.restaurantName || ''} ${item.orderNumber || ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [data?.orders, deliveryQuery]);

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <Text style={styles.title}>Kazanclarim</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0f766e" style={{ marginTop: 40 }} />
      ) : !data ? (
        <Text style={styles.empty}>Veri yuklenemedi</Text>
      ) : (
        <>
          <View style={styles.calendarBox}>
            <Text style={styles.sectionTitle}>Kazanc Takvimi</Text>
            <Text style={styles.calendarHint}>Gostergeler secilen gun icin hesaplanir. Varsayilan bugundur.</Text>
            <TextInput
              style={styles.dateInput}
              value={earningsDate}
              onChangeText={setEarningsDate}
              placeholder="YYYY-AA-GG"
              placeholderTextColor="#94a3b8"
              selectionColor="#0f766e"
            />
          </View>

          <View style={styles.grid}>
            <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
              <Text style={styles.statLabel}>Gunluk Teslimat</Text>
              <Text style={[styles.statValue, { color: '#059669' }]}>{data.summary.totalOrders}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
              <Text style={styles.statLabel}>Siparis Basi Ucret</Text>
              <Text style={[styles.statValue, { color: '#2563eb' }]}>{data.summary.paymentPerOrder.toFixed(2)} ₺</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fefce8' }]}>
              <Text style={styles.statLabel}>Gunluk Kazanc</Text>
              <Text style={[styles.statValue, { color: '#ca8a04' }]}>{data.summary.totalEarnings.toFixed(2)} ₺</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Secilen Gun Teslimatlari</Text>
          <TextInput
            style={styles.searchInput}
            value={deliveryQuery}
            onChangeText={setDeliveryQuery}
            placeholder="Restoran veya siparis no ara"
            placeholderTextColor="#94a3b8"
            selectionColor="#0f766e"
          />
          {data.orders.length === 0 && <Text style={styles.empty}>Henuz teslimat yok</Text>}
          {visibleDeliveries.map((o: any) => (
            <View key={o.orderId} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowMain}>{o.restaurantName}</Text>
                <Text style={styles.rowSub}>{o.orderNumber}</Text>
                <Text style={styles.rowSub}>{o.deliveredAt ? new Date(o.deliveredAt).toLocaleString('tr-TR') : ''}</Text>
              </View>
              <Text style={styles.rowAmount}>+{o.earning.toFixed(2)} ₺</Text>
            </View>
          ))}

          <View style={styles.settlementSection}>
            <Text style={styles.sectionTitle}>Gunluk Hesap Kapama</Text>
            <TextInput
              style={styles.dateInput}
              value={settlementDate}
              onChangeText={setSettlementDate}
              placeholder="YYYY-AA-GG"
              placeholderTextColor="#94a3b8"
              selectionColor="#0f766e"
            />
            <View style={styles.grid}>
              <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
                <Text style={styles.statLabel}>Restoran</Text>
                <Text style={[styles.statValue, { color: '#2563eb' }]}>{settlement?.totals?.totalRestaurants || 0}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
                <Text style={styles.statLabel}>Acilan Hesap</Text>
                <Text style={[styles.statValue, { color: '#ea580c' }]}>{settlement?.totals?.openRestaurants || 0}</Text>
              </View>
            </View>
            <View style={styles.grid}>
              <View style={[styles.statCard, { backgroundColor: '#eef2ff' }]}>
                <Text style={styles.statLabel}>Nakit Paket</Text>
                <Text style={[styles.statValue, { color: '#4f46e5' }]}>{settlement?.totals?.totalPackages || 0}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#f0f9ff' }]}>
                <Text style={styles.statLabel}>Kart Direkt Yatan</Text>
                <Text style={[styles.statValue, { color: '#0284c7', fontSize: 18 }]}>{Number(settlement?.totals?.totalDirectCardAmount || 0).toFixed(2)} ₺</Text>
              </View>
            </View>
            <Pressable style={[styles.closeButton, closing && styles.closeButtonDisabled]} onPress={handleCloseSettlement} disabled={closing || !(settlement?.totals?.openRestaurants > 0)}>
              <Text style={styles.closeButtonText}>{closing ? 'Kapatiliyor...' : 'Tum Acik Restoranlari Kapat'}</Text>
            </Pressable>
            {(settlement?.rows || []).map((row: any) => (
              <View key={row.restaurantId} style={styles.settlementRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowMain}>{row.restaurantName}</Text>
                  <Text style={styles.rowSub}>{row.settlementPackageCount} nakit paket</Text>
                  {row.cardPackageCount > 0 && <Text style={styles.rowSub}>{row.cardPackageCount} kart paket - direkt yatti</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.rowAmount, row.isClosed && { color: '#94a3b8', textDecorationLine: 'line-through' }]}>{row.isClosed ? '0.00' : Number(row.amountToRestaurant || 0).toFixed(2)} ₺</Text>
                  <Text style={styles.rowSub}>{row.isClosed ? 'Kapali' : row.needsSettlement ? 'Acik' : 'Kart Odemesi'}</Text>
                  {row.directCardAmount > 0 && <Text style={styles.rowSub}>Direkt: {Number(row.directCardAmount).toFixed(2)} ₺</Text>}
                  <Pressable
                    style={[styles.rowActionBtn, row.isClosed ? styles.rowActionOpen : styles.rowActionClose, closing && styles.closeButtonDisabled]}
                    onPress={() =>
                      row.isClosed
                        ? handleReopenRestaurantSettlement(row.restaurantId)
                        : handleCloseRestaurantSettlement(row.restaurantId)
                    }
                    disabled={closing || (!row.isClosed && !row.needsSettlement)}
                  >
                    <Text style={styles.rowActionText}>{row.isClosed ? 'Yeniden Ac' : row.needsSettlement ? 'Bu Restorani Kapat' : 'Kapatilamaz'}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
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
  statValue: { fontSize: 22, fontWeight: '700' },
  calendarBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginBottom: 16 },
  calendarHint: { color: '#64748b', fontSize: 12, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 10 },
  searchInput: { backgroundColor: '#fff', color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  dateInput: { backgroundColor: '#fff', color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  row: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  rowMain: { fontWeight: '600', color: '#0f172a' },
  rowSub: { fontSize: 12, color: '#64748b' },
  rowAmount: { fontSize: 16, fontWeight: '700', color: '#16a34a' },
  settlementSection: { marginTop: 24, marginBottom: 24 },
  closeButton: { backgroundColor: '#0f766e', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
  closeButtonDisabled: { opacity: 0.5 },
  closeButtonText: { color: '#fff', fontWeight: '700' },
  rowActionBtn: { marginTop: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  rowActionClose: { backgroundColor: '#0f766e' },
  rowActionOpen: { backgroundColor: '#d97706' },
  rowActionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  settlementRow: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 }
});
