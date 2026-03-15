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
import AdminHeader from '../../components/AdminHeader';

interface LogEntry {
  id: string;
  type: string;
  action: string;
  description: string;
  timestamp: string;
}

const ACTION_COLOR: Record<string, string> = {
  DELIVERED: '#16a34a',
  CANCELLED: '#dc2626',
  PENDING: '#d97706',
  ASSIGNED: '#2563eb',
  PICKED_UP: '#7c3aed',
  PREPARING: '#ea580c',
  APPROVED: '#0f766e',
};

export default function AdminLogsScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [limit, setLimit] = useState(50);

  const fetch = useCallback(async (lim: number) => {
    try {
      const data = await adminService.getSystemLogs(lim);
      setLogs(data.logs ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(limit); }, []);

  const handleRefresh = () => { setRefreshing(true); fetch(limit); };

  const handleLoadMore = () => {
    const newLimit = limit + 50;
    setLimit(newLimit);
    fetch(newLimit);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader title="Sistem Logları" />
      <View style={styles.headerRow}>
        <Text style={styles.count}>{logs.length} kayıt</Text>
        <Pressable style={styles.moreBtn} onPress={handleLoadMore}>
          <Text style={styles.moreBtnText}>+50 Yükle</Text>
        </Pressable>
      </View>
      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.logItem}>
            <View style={styles.logTop}>
              <View style={[styles.badge, { backgroundColor: ACTION_COLOR[item.action] ?? '#6b7280' }]}>
                <Text style={styles.badgeText}>{item.action}</Text>
              </View>
              <Text style={styles.timestamp}>
                {new Date(item.timestamp).toLocaleString('tr-TR', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Log bulunamadı</Text>}
        contentContainerStyle={{ padding: 12, paddingTop: 0 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  count: { fontSize: 13, color: '#6b7280' },
  moreBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  moreBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  logItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  timestamp: { fontSize: 11, color: '#9ca3af' },
  description: { fontSize: 13, color: '#374151' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
