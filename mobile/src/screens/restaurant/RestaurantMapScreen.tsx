import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { restaurantService } from '../../services/restaurantService';

interface CourierLocation {
  courierId: string;
  courierName?: string;
  latitude: number;
  longitude: number;
  updatedAt?: string;
}

export default function RestaurantMapScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [couriers, setCouriers] = useState<CourierLocation[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const load = useCallback(async () => {
    try {
      const [profileRes, courierRes] = await Promise.all([
        restaurantService.getProfile(),
        restaurantService.getCourierLocations()
      ]);
      setProfile(profileRes.restaurant);
      setCouriers(courierRes.couriers || []);
      setLatitude(profileRes.restaurant?.latitude != null ? String(profileRes.restaurant.latitude) : '');
      setLongitude(profileRes.restaurant?.longitude != null ? String(profileRes.restaurant.longitude) : '');
    } catch {
      Alert.alert('Hata', 'Harita verileri yuklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const handleSaveLocation = async () => {
    const nextLat = Number(latitude);
    const nextLng = Number(longitude);
    if (Number.isNaN(nextLat) || Number.isNaN(nextLng)) {
      Alert.alert('Gecersiz Konum', 'Gecerli enlem ve boylam girin');
      return;
    }

    setSaving(true);
    try {
      await restaurantService.updateLocation(nextLat, nextLng);
      await load();
      Alert.alert('Basarili', 'Restoran konumu guncellendi');
    } catch {
      Alert.alert('Hata', 'Konum kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <Text style={styles.title}>Canli Kurye Takibi</Text>
      <Text style={styles.subtitle}>Harita yerine operasyon odakli canli konum listesi</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Restoran Konumu</Text>
            <Text style={styles.meta}>Adres: {profile?.address || '-'}</Text>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Latitude"
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Longitude"
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="decimal-pad"
              />
            </View>
            <Pressable style={[styles.primaryButton, saving && styles.disabled]} onPress={handleSaveLocation} disabled={saving}>
              <Text style={styles.primaryText}>{saving ? 'Kaydediliyor...' : 'Konumu Guncelle'}</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aktif Kuryeler</Text>
            <Text style={styles.meta}>Toplam aktif/izlenen kurye: {couriers.length}</Text>
            {couriers.length === 0 ? (
              <Text style={styles.empty}>Su an aktif konum paylaşan kurye yok</Text>
            ) : (
              couriers.map((courier) => (
                <View key={courier.courierId} style={styles.courierCard}>
                  <View style={styles.courierHeader}>
                    <Text style={styles.courierName}>{courier.courierName || 'Kurye'}</Text>
                    <Text style={styles.courierMeta}>{courier.updatedAt ? new Date(courier.updatedAt).toLocaleTimeString('tr-TR') : 'Canli'}</Text>
                  </View>
                  <Text style={styles.coord}>Lat: {Number(courier.latitude).toFixed(6)}</Text>
                  <Text style={styles.coord}>Lng: {Number(courier.longitude).toFixed(6)}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#64748b', marginTop: 4, marginBottom: 16 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  meta: { color: '#475569', marginBottom: 10 },
  rowInputs: { flexDirection: 'row', gap: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  halfInput: { flex: 1 },
  primaryButton: { backgroundColor: '#1d4ed8', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 10 },
  courierCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginTop: 10, backgroundColor: '#f8fafc' },
  courierHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  courierName: { fontWeight: '700', color: '#0f172a' },
  courierMeta: { color: '#64748b', fontSize: 12 },
  coord: { color: '#334155', fontSize: 13 }
});
