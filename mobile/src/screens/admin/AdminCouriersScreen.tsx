import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { adminService } from '../../services/adminService';

interface CourierItem {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isAvailable?: boolean;
  totalOrders?: number;
}

export default function AdminCouriersScreen() {
  const [couriers, setCouriers] = useState<CourierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminService.getAllCouriers();
      setCouriers(data.couriers || data);
    } catch {
      setCouriers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item }: { item: CourierItem }) => (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: item.isActive ? '#0f766e' : '#94a3b8' }]}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.email}>{item.email}</Text>
        {item.totalOrders !== undefined && (
          <Text style={styles.orders}>Toplam Teslimat: {item.totalOrders}</Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[styles.badge, { backgroundColor: item.isActive ? '#ecfdf5' : '#f1f5f9' }]}>
          <Text style={{ color: item.isActive ? '#16a34a' : '#94a3b8', fontSize: 11, fontWeight: '600' }}>
            {item.isActive ? 'Aktif' : 'Pasif'}
          </Text>
        </View>
        {item.isAvailable !== undefined && (
          <View style={[styles.badge, { backgroundColor: item.isAvailable ? '#eff6ff' : '#fff7ed' }]}>
            <Text style={{ color: item.isAvailable ? '#2563eb' : '#ea580c', fontSize: 11, fontWeight: '600' }}>
              {item.isAvailable ? 'Musait' : 'Mesgul'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Kuryeler</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={couriers}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Kurye bulunamadi</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  list: { gap: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  name: { fontWeight: '700', fontSize: 14, color: '#0f172a' },
  email: { fontSize: 12, color: '#64748b', marginTop: 2 },
  orders: { fontSize: 12, color: '#7c3aed', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 }
});
