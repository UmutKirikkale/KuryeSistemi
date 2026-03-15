import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { adminService } from '../../services/adminService';
import { wsService } from '../../services/websocket';
import AdminHeader from '../../components/AdminHeader';

interface CourierMarker {
  courierId: string;
  courierName?: string;
  latitude: number;
  longitude: number;
  available?: boolean;
  updatedAt?: string;
}

const isValidCoordinate = (latitude: number, longitude: number) => (
  Number.isFinite(latitude)
  && Number.isFinite(longitude)
  && Math.abs(latitude) <= 90
  && Math.abs(longitude) <= 180
);

const { width } = Dimensions.get('window');

export default function AdminCourierMapScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [couriers, setCouriers] = useState<CourierMarker[]>([]);
  const [selected, setSelected] = useState<CourierMarker | null>(null);
  const mapRef = useRef<MapView>(null);

  const fetchCouriers = useCallback(async () => {
    try {
      const data = await adminService.getAllCouriers();
      const list: CourierMarker[] = (data.couriers ?? data ?? [])
        .filter((c: any) => c.currentLatitude != null && c.currentLongitude != null)
        .map((c: any) => ({
          courierId: c.id,
          courierName: c.user?.name ?? c.name ?? 'Kurye',
          latitude: Number(c.currentLatitude),
          longitude: Number(c.currentLongitude),
          available: c.available,
          updatedAt: c.updatedAt,
        }))
        .filter((courier: CourierMarker) => isValidCoordinate(courier.latitude, courier.longitude));
      setCouriers(list);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.error || 'Kuryeler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCouriers();

    const handleLocationUpdate = (data: any) => {
      setCouriers(prev => {
        if (!isValidCoordinate(Number(data.latitude), Number(data.longitude))) {
          return prev;
        }

        const idx = prev.findIndex(c => c.courierId === data.courierId);
        const updated: CourierMarker = {
          courierId: data.courierId,
          courierName: data.courierName ?? prev[idx]?.courierName ?? 'Kurye',
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          available: prev[idx]?.available,
          updatedAt: new Date().toISOString(),
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    };

    wsService.onLocationUpdate(handleLocationUpdate);
    return () => { wsService.removeListener('courier:location:broadcast', handleLocationUpdate); };
  }, [fetchCouriers]);

  const handleRefresh = () => { setRefreshing(true); fetchCouriers(); };

  const handleMarkerPress = (c: CourierMarker) => {
    setSelected(c);
    mapRef.current?.animateToRegion({
      latitude: c.latitude,
      longitude: c.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 500);
  };

  const initialRegion: Region = (() => {
    if (couriers.length > 0) {
      const lats = couriers.map(c => c.latitude);
      const lngs = couriers.map(c => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(maxLat - minLat, 0.05) * 1.4,
        longitudeDelta: Math.max(maxLng - minLng, 0.05) * 1.4,
      };
    }
    return { latitude: 35.1264, longitude: 33.4299, latitudeDelta: 0.3, longitudeDelta: 0.3 };
  })();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader title="Kurye Haritası" />

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>Toplam: {couriers.length}</Text>
        <Text style={styles.statsText}>Müsait: {couriers.filter(c => c.available).length}</Text>
        <Text style={styles.statsText}>Meşgul: {couriers.filter(c => !c.available).length}</Text>
        <Pressable onPress={handleRefresh} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>Yenile</Text>
        </Pressable>
      </View>

      {couriers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Konumu olan kurye bulunamadı</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
        >
          {couriers.map(c => (
            <Marker
              key={c.courierId}
              coordinate={{ latitude: c.latitude, longitude: c.longitude }}
              title={c.courierName}
              description={c.available ? '🟢 Müsait' : '🔴 Meşgul'}
              pinColor={c.available ? '#16a34a' : '#dc2626'}
              onPress={() => handleMarkerPress(c)}
            />
          ))}
        </MapView>
      )}

      {/* Selected courier info */}
      {selected && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoName}>{selected.courierName}</Text>
            <Text style={[styles.infoStatus, { color: selected.available ? '#16a34a' : '#dc2626' }]}>
              {selected.available ? '● Müsait' : '● Meşgul'}
            </Text>
          </View>
          <Text style={styles.infoCoords}>
            {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
          </Text>
          {selected.updatedAt && (
            <Text style={styles.infoTime}>
              Güncellendi: {new Date(selected.updatedAt).toLocaleTimeString('tr-TR')}
            </Text>
          )}
          <Pressable onPress={() => setSelected(null)} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Kapat</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  statsText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  refreshBtn: {
    marginLeft: 'auto',
    backgroundColor: '#7c3aed',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  refreshBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  map: { flex: 1, width },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 14 },
  infoCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  infoName: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  infoStatus: { fontSize: 13, fontWeight: '600' },
  infoCoords: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  infoTime: { fontSize: 12, color: '#9ca3af', marginBottom: 10 },
  closeBtn: { alignSelf: 'flex-end', backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  closeBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
});
