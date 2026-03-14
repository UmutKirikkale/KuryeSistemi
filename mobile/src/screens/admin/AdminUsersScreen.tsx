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
import { adminService } from '../../services/adminService';
import AdminHeader from '../../components/AdminHeader';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'PASSIVE'>('ALL');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await adminService.getAllUsers();
      setUsers(data.users || data);
    } catch {
      Alert.alert('Hata', 'Kullanicilar yuklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (userId: string, currentActive: boolean) => {
    const action = currentActive ? 'pasife al' : 'aktif yap';
    Alert.alert('Kullanici Durumu', `Bu kullanicıyı ${action}mak istiyor musunuz?`, [
      {
        text: 'Evet',
        onPress: async () => {
          setActionId(userId);
          try {
            await adminService.toggleUserStatus(userId);
            setUsers((prev) =>
              prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
            );
          } catch {
            Alert.alert('Hata', 'Durum guncellenemedi');
          } finally {
            setActionId(null);
          }
        }
      },
      { text: 'Vazgec', style: 'cancel' }
    ]);
  };

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin',
    RESTAURANT: 'Restoran',
    COURIER: 'Kurye',
    CUSTOMER: 'Musteri'
  };

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const byStatus = users.filter((user) => {
      if (filter === 'ACTIVE') return user.isActive;
      if (filter === 'PASSIVE') return !user.isActive;
      return true;
    });

    if (!normalizedQuery) return byStatus;

    return byStatus.filter((user) => {
      const haystack = `${user.name} ${user.email} ${ROLE_LABELS[user.role] || user.role}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [users, filter, query]);

  const renderItem = ({ item }: { item: UserItem }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.role}>{ROLE_LABELS[item.role] || item.role}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <View style={[styles.statusDot, { backgroundColor: item.isActive ? '#16a34a' : '#94a3b8' }]}>
          <Text style={styles.statusText}>{item.isActive ? 'Aktif' : 'Pasif'}</Text>
        </View>
        <Pressable
          style={[styles.toggleBtn, item.isActive ? styles.btnWarn : styles.btnGreen]}
          onPress={() => handleToggle(item.id, item.isActive)}
          disabled={actionId === item.id}
        >
          {actionId === item.id ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.toggleText}>{item.isActive ? 'Pasife Al' : 'Aktif Yap'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <AdminHeader title="Kullanicilar" subtitle="Tum hesaplari tek ekranda yonet" />
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#eff6ff' }]}>
          <Text style={styles.summaryLabel}>Toplam</Text>
          <Text style={[styles.summaryValue, { color: '#2563eb' }]}>{users.length}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#ecfdf5' }]}>
          <Text style={styles.summaryLabel}>Aktif</Text>
          <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{users.filter((u) => u.isActive).length}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <Pressable style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]} onPress={() => setFilter('ALL')}>
          <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>Tum</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, filter === 'ACTIVE' && styles.filterChipActive]} onPress={() => setFilter('ACTIVE')}>
          <Text style={[styles.filterText, filter === 'ACTIVE' && styles.filterTextActive]}>Aktif</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, filter === 'PASSIVE' && styles.filterChipActive]} onPress={() => setFilter('PASSIVE')}>
          <Text style={[styles.filterText, filter === 'PASSIVE' && styles.filterTextActive]}>Pasif</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Ad, email veya role gore ara"
        placeholderTextColor="#94a3b8"
        selectionColor="#7c3aed"
        value={query}
        onChangeText={setQuery}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(u) => u.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Kullanici bulunamadi</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12 },
  summaryLabel: { fontSize: 12, color: '#64748b' },
  summaryValue: { marginTop: 4, fontSize: 18, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterChip: { backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  filterChipActive: { backgroundColor: '#7c3aed' },
  filterText: { color: '#334155', fontWeight: '600', fontSize: 12 },
  filterTextActive: { color: '#fff' },
  searchInput: { backgroundColor: '#fff', color: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  list: { gap: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  name: { fontWeight: '700', fontSize: 14, color: '#0f172a' },
  email: { fontSize: 12, color: '#64748b', marginTop: 2 },
  role: { fontSize: 12, color: '#7c3aed', marginTop: 2, fontWeight: '500' },
  statusDot: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  btnWarn: { backgroundColor: '#f59e0b' },
  btnGreen: { backgroundColor: '#16a34a' },
  toggleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 }
});
