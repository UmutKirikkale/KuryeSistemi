import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { adminService } from '../../services/adminService';
import AdminHeader from '../../components/AdminHeader';

interface RestaurantItem {
  id: string;
  name?: string;
  email?: string;
  isActive?: boolean;
  address?: string;
  totalOrders?: number;
  commissionRate?: number;
  commissionPerOrder?: number;
  user?: {
    name?: string;
    email?: string;
    isActive?: boolean;
  };
}

export default function AdminRestaurantsScreen({ navigation }: any) {
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await adminService.getAllRestaurants();
      setRestaurants(data.restaurants || data);
    } catch {
      setRestaurants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = navigation?.addListener?.('focus', load);
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [load, navigation]);

  const filteredRestaurants = restaurants.filter((item) => {
    const haystack = `${item.name || item.user?.name || ''} ${item.email || item.user?.email || ''} ${item.address || ''}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const activeCount = restaurants.filter((item) => (item.isActive ?? item.user?.isActive ?? false)).length;
  const totalOrders = restaurants.reduce((sum, item) => sum + Number(item.totalOrders || 0), 0);
  const avgCommission = restaurants.length ? restaurants.reduce((sum, item) => sum + Number(item.commissionPerOrder || 0), 0) / restaurants.length : 0;

  const renderItem = ({ item }: { item: RestaurantItem }) => {
    const displayName = item.name || item.user?.name || 'Restoran';
    const displayEmail = item.email || item.user?.email || '-';
    const isActive = item.isActive ?? item.user?.isActive ?? false;

    return (
    <Pressable style={styles.card} onPress={() => navigation.navigate('AdminRestaurantDetail', { restaurant: item })}>
      <View style={[styles.avatar, { backgroundColor: isActive ? '#1d4ed8' : '#94a3b8' }]}>
        <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{displayEmail}</Text>
        {item.totalOrders !== undefined && (
          <Text style={styles.sub}>Toplam Siparis: {item.totalOrders}</Text>
        )}
        {item.commissionRate !== undefined && (
          <Text style={styles.sub}>Komisyon: %{item.commissionRate}</Text>
        )}
        <Text style={styles.sub}>Dokun: Detay</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: isActive ? '#ecfdf5' : '#f1f5f9' }]}>
        <Text style={{ color: isActive ? '#16a34a' : '#94a3b8', fontSize: 11, fontWeight: '600' }}>
          {isActive ? 'Aktif' : 'Pasif'}
        </Text>
      </View>
    </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <AdminHeader title="Restoranlar" subtitle="Restoran listesi, arama ve detay sayfalari" />
      <Pressable style={styles.createButton} onPress={() => navigation.navigate('AdminCreateRestaurant')}>
        <Text style={styles.createButtonText}>+ Yeni Restoran</Text>
      </Pressable>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#eff6ff' }]}>
          <Text style={styles.summaryLabel}>Toplam</Text>
          <Text style={[styles.summaryValue, { color: '#2563eb' }]}>{restaurants.length}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#ecfdf5' }]}>
          <Text style={styles.summaryLabel}>Aktif</Text>
          <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{activeCount}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#fff7ed' }]}>
          <Text style={styles.summaryLabel}>Toplam Siparis</Text>
          <Text style={[styles.summaryValue, { color: '#ea580c' }]}>{totalOrders}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#f5f3ff' }]}>
          <Text style={styles.summaryLabel}>Ort. Komisyon</Text>
          <Text style={[styles.summaryValue, { color: '#7c3aed' }]}>{avgCommission.toFixed(1)} ₺</Text>
        </View>
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="Restoran ara: ad, email, adres"
        value={query}
        onChangeText={setQuery}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredRestaurants}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Restoran bulunamadi</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  createButton: { backgroundColor: '#1d4ed8', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  createButtonText: { color: '#fff', fontWeight: '700' },
  summaryCard: { width: '48%', borderRadius: 12, padding: 12 },
  summaryLabel: { fontSize: 12, color: '#64748b' },
  summaryValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  list: { gap: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  name: { fontWeight: '700', fontSize: 14, color: '#0f172a' },
  email: { fontSize: 12, color: '#64748b', marginTop: 2 },
  sub: { fontSize: 12, color: '#7c3aed', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 }
});
