import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { CustomerTabParamList } from '../../navigation/types';
import { marketplaceService, MarketplaceOrderStatusResponse } from '../../services/marketplaceService';
import { useCustomerStore } from '../../store/customerStore';

type TrackingRoute = RouteProp<CustomerTabParamList, 'CustomerOrderTracking'>;

type OrderRating = {
  id: string;
  speedScore: number;
  tasteScore: number;
  priceScore: number;
  createdAt: string;
};

const statusLabel: Record<string, string> = {
  PENDING: 'Bekliyor',
  ASSIGNED: 'Kuryeye Atandi',
  APPROVED: 'Onaylandi',
  PREPARING: 'Hazirlaniyor',
  PICKED_UP: 'Yola Cikti',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'Iptal Edildi'
};

export default function CustomerOrderTrackingScreen() {
  const route = useRoute<TrackingRoute>();
  const { isAuthenticated } = useCustomerStore();
  const [orderNumber, setOrderNumber] = useState(route.params?.orderNumber || '');
  const [orderStatus, setOrderStatus] = useState<MarketplaceOrderStatusResponse['order'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rating, setRating] = useState<OrderRating | null>(null);
  const [ratingForm, setRatingForm] = useState({ speedScore: '10', tasteScore: '10', priceScore: '10' });
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (route.params?.orderNumber) {
      setOrderNumber(route.params.orderNumber);
      void performSearch(route.params.orderNumber);
    }
  }, [route.params?.orderNumber]);

  const performSearch = async (orderNum: string) => {
    if (!orderNum.trim()) {
      setError('Lutfen siparis numarasi girin');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setOrderStatus(null);
      setRating(null);

      const response = await marketplaceService.getOrderStatus(orderNum.trim());
      setOrderStatus(response.order);

      if (isAuthenticated) {
        const ratingResponse = await marketplaceService.getOrderRating(orderNum.trim());
        setRating(ratingResponse.rating as OrderRating | null);
      }
    } catch (searchError: any) {
      setError(searchError?.response?.data?.error || 'Siparis bulunamadi');
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    if (!orderStatus) return;

    const speedScore = Number(ratingForm.speedScore);
    const tasteScore = Number(ratingForm.tasteScore);
    const priceScore = Number(ratingForm.priceScore);

    const values = [speedScore, tasteScore, priceScore];
    if (values.some((value) => !Number.isFinite(value) || value < 1 || value > 10)) {
      Alert.alert('Uyari', 'Puanlar 1 ile 10 arasinda olmali');
      return;
    }

    try {
      setSubmittingRating(true);
      const response = await marketplaceService.submitOrderRating(orderStatus.orderNumber, {
        speedScore,
        tasteScore,
        priceScore
      });
      setRating(response.rating as OrderRating | null);
      Alert.alert('Basarili', 'Degerlendirme kaydedildi');
    } catch (ratingError: any) {
      Alert.alert('Hata', ratingError?.response?.data?.error || 'Degerlendirme kaydedilemedi');
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <ScrollView style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Siparis Takibi</Text>

        <TextInput
          style={styles.input}
          value={orderNumber}
          onChangeText={setOrderNumber}
          placeholder="Orn: MKT-12345-ABC"
          autoCapitalize="characters"
        />

        <Pressable style={styles.searchButton} onPress={() => void performSearch(orderNumber)} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchText}>Sorgula</Text>}
        </Pressable>

        {!!error && <Text style={styles.error}>{error}</Text>}

        {orderStatus && (
          <View style={styles.resultWrap}>
            <Text style={styles.orderNo}>{orderStatus.orderNumber}</Text>
            <Text style={styles.status}>Durum: {statusLabel[orderStatus.status] || orderStatus.status}</Text>
            <Text style={styles.meta}>Tarih: {new Date(orderStatus.createdAt).toLocaleString('tr-TR')}</Text>
            <Text style={styles.meta}>Musteri: {orderStatus.customerName} - {orderStatus.customerPhone}</Text>
            <Text style={styles.meta}>Restoran: {orderStatus.pickup.restaurant}</Text>
            <Text style={styles.meta}>Alis adresi: {orderStatus.pickup.address}</Text>
            <Text style={styles.meta}>Teslim adresi: {orderStatus.delivery.address}</Text>
            {orderStatus.courier && (
              <Text style={styles.meta}>Kurye: {orderStatus.courier.name} ({orderStatus.courier.phone})</Text>
            )}
            <Text style={styles.total}>Tutar: {Number(orderStatus.orderAmount).toFixed(2)} TL</Text>
            {!!orderStatus.notes && <Text style={styles.note}>Not: {orderStatus.notes}</Text>}

            {isAuthenticated && orderStatus.status === 'DELIVERED' && (
              <View style={styles.ratingBox}>
                <Text style={styles.ratingTitle}>Restoran Degerlendirmesi</Text>
                {rating ? (
                  <>
                    <Text style={styles.meta}>Hiz: {rating.speedScore}/10</Text>
                    <Text style={styles.meta}>Lezzet: {rating.tasteScore}/10</Text>
                    <Text style={styles.meta}>Fiyat: {rating.priceScore}/10</Text>
                  </>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={ratingForm.speedScore}
                      onChangeText={(value) => setRatingForm((prev) => ({ ...prev, speedScore: value }))}
                      placeholder="Hiz (1-10)"
                    />
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={ratingForm.tasteScore}
                      onChangeText={(value) => setRatingForm((prev) => ({ ...prev, tasteScore: value }))}
                      placeholder="Lezzet (1-10)"
                    />
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={ratingForm.priceScore}
                      onChangeText={(value) => setRatingForm((prev) => ({ ...prev, priceScore: value }))}
                      placeholder="Fiyat (1-10)"
                    />
                    <Pressable
                      style={[styles.searchButton, submittingRating && styles.disabled]}
                      onPress={() => void submitRating()}
                      disabled={submittingRating}
                    >
                      {submittingRating ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchText}>Degerlendir</Text>}
                    </Pressable>
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', padding: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#fff'
  },
  searchButton: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12
  },
  searchText: { color: '#fff', fontWeight: '700' },
  error: { color: '#b91c1c', marginTop: 8 },
  resultWrap: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 },
  orderNo: { fontWeight: '700', color: '#0f172a', fontSize: 16 },
  status: { marginTop: 6, color: '#1d4ed8', fontWeight: '700' },
  meta: { color: '#334155', marginTop: 4, fontSize: 13 },
  total: { marginTop: 8, color: '#16a34a', fontWeight: '700', fontSize: 16 },
  note: { marginTop: 8, color: '#475569' },
  ratingBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 },
  ratingTitle: { fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  disabled: { opacity: 0.6 }
});
