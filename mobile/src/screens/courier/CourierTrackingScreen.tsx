import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import * as Location from 'expo-location';
import { locationService } from '../../services/locationService';

export default function CourierTrackingScreen() {
  const [isTracking, setIsTracking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [statusMsg, setStatusMsg] = useState('GPS takibi kapalı');
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    checkPermission();
  }, []);

  useEffect(() => {
    // Uygulama arka plana gidince takibi durdurmak yerine, foreground service ile devam eder.
    // Expo Location arka planda çalışmak için foreground service kullanır.
    const sub = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current === 'active' &&
        nextState === 'background' &&
        isTracking
      ) {
        setStatusMsg('Arkaplan GPS aktif');
      } else if (nextState === 'active') {
        setStatusMsg(isTracking ? 'GPS takibi aktif' : 'GPS takibi kapalı');
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [isTracking]);

  const checkPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermissionGranted(false);
      Alert.alert(
        'Konum İzni Gerekli',
        'GPS takibi için konum iznine ihtiyaç var. Lütfen ayarlardan izin verin.'
      );
      return;
    }

    if (Platform.OS === 'android') {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      setPermissionGranted(bgStatus === 'granted');
    } else {
      setPermissionGranted(true);
    }
  };

  const startTracking = async () => {
    if (!permissionGranted) {
      await checkPermission();
      return;
    }

    try {
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,   // 10 saniyede bir
          distanceInterval: 30   // veya 30 metre hareket olunca
        },
        async (loc) => {
          const { latitude, longitude, accuracy } = loc.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          try {
            await locationService.updateLocation(latitude, longitude, accuracy ?? undefined);
          } catch {
            // sessiz geç, bir sonraki güncelleme denenecek
          }
        }
      );

      setIsTracking(true);
      setStatusMsg('GPS takibi aktif');
    } catch (e) {
      Alert.alert('Hata', 'GPS baslatilamadi');
    }
  };

  const stopTracking = () => {
    watchRef.current?.remove();
    watchRef.current = null;
    setIsTracking(false);
    setStatusMsg('GPS takibi kapalı');
  };

  const handleToggleAvailability = async () => {
    try {
      const res = await locationService.toggleAvailability();
      setIsAvailable(res.isAvailable);
    } catch {
      Alert.alert('Hata', 'Durum guncellenemedi');
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>GPS Takip</Text>

      {/* İzin durumu */}
      {permissionGranted === false && (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            Konum izni verilmedi. Ayarlardan "Her zaman" iznini etkinleştirin.
          </Text>
          <Pressable style={styles.btnSecondary} onPress={checkPermission}>
            <Text style={styles.btnSecText}>İzin İste</Text>
          </Pressable>
        </View>
      )}

      {/* Konum bilgisi */}
      <View style={[styles.statusBox, { borderColor: isTracking ? '#16a34a' : '#94a3b8' }]}>
        <Text style={[styles.statusDot, { color: isTracking ? '#16a34a' : '#94a3b8' }]}>●</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusText}>{statusMsg}</Text>
          {currentLocation && (
            <Text style={styles.coordText}>
              {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            </Text>
          )}
        </View>
      </View>

      {/* GPS Başlat / Durdur */}
      <Pressable
        style={[styles.btn, isTracking ? styles.btnDanger : styles.btnPrimary]}
        onPress={isTracking ? stopTracking : startTracking}
      >
        <Text style={styles.btnText}>{isTracking ? 'Takibi Durdur' : 'Takibi Baslat'}</Text>
      </Pressable>

      {/* Müsaitlik */}
      <Pressable
        style={[styles.btn, isAvailable ? styles.btnSuccess : styles.btnWarning]}
        onPress={handleToggleAvailability}
      >
        <Text style={styles.btnText}>{isAvailable ? 'Musait (Dokun: Mesgul Yap)' : 'Mesgul (Dokun: Musait Yap)'}</Text>
      </Pressable>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Arkaplan GPS Nası Çalışır?</Text>
        <Text style={styles.infoText}>
          • Android: Uygulama arka planda açık kaldığı sürece GPS akışı devam eder.{'\n'}
          • iOS: Konum izni "Her Zaman" seçilirse arka planda çalışır.{'\n'}
          • Uygulamayı tamamen kapatırsanız GPS durur. Kurye uygulamasını arka planda tutunuz.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  warnBox: { backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, marginBottom: 14 },
  warnText: { color: '#92400e', fontSize: 13, marginBottom: 8 },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10
  },
  statusDot: { fontSize: 20 },
  statusText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  coordText: { fontSize: 11, color: '#64748b', marginTop: 3 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  btnPrimary: { backgroundColor: '#0f766e' },
  btnDanger: { backgroundColor: '#b91c1c' },
  btnSuccess: { backgroundColor: '#16a34a' },
  btnWarning: { backgroundColor: '#d97706' },
  btnSecondary: { backgroundColor: '#64748b', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  infoBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginTop: 8 },
  infoTitle: { fontWeight: '700', color: '#1e40af', marginBottom: 6 },
  infoText: { color: '#1e40af', fontSize: 13, lineHeight: 20 }
});
