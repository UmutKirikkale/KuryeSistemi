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
import { customerService, SavedAddress } from '../../services/customerService';
import { useCustomerStore } from '../../store/customerStore';

export default function CustomerProfileScreen() {
  const { customer, logout } = useCustomerStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [orders, setOrders] = useState<Array<{ id: string; orderNumber: string; status: string; orderAmount: number; createdAt: string }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: '',
    address: '',
    latitude: '',
    longitude: '',
    isDefault: false
  });

  const load = useCallback(async () => {
    try {
      const [profileRes, ordersRes] = await Promise.all([
        customerService.getProfile(),
        customerService.getOrders()
      ]);
      setAddresses(profileRes.customer.savedAddresses);
      setOrders(
        ordersRes.orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          orderAmount: order.orderAmount,
          createdAt: order.createdAt
        }))
      );
    } catch {
      Alert.alert('Hata', 'Profil verileri yuklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddAddress = async () => {
    if (!form.label.trim() || !form.address.trim()) {
      Alert.alert('Uyari', 'Etiket ve adres zorunludur');
      return;
    }

    const latitude = Number(form.latitude || '0');
    const longitude = Number(form.longitude || '0');

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      Alert.alert('Uyari', 'Koordinatlar gecerli sayi olmali');
      return;
    }

    try {
      await customerService.createAddress({
        label: form.label.trim(),
        address: form.address.trim(),
        latitude,
        longitude,
        isDefault: form.isDefault
      });

      setForm({ label: '', address: '', latitude: '', longitude: '', isDefault: false });
      setShowForm(false);
      await load();
    } catch (error: any) {
      Alert.alert('Hata', error?.response?.data?.error || 'Adres eklenemedi');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await customerService.deleteAddress(addressId);
      await load();
    } catch (error: any) {
      Alert.alert('Hata', error?.response?.data?.error || 'Adres silinemedi');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await customerService.updateAddress(addressId, { isDefault: true });
      await load();
    } catch (error: any) {
      Alert.alert('Hata', error?.response?.data?.error || 'Varsayilan degistirilemedi');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
    >
      <View style={styles.section}>
        <Text style={styles.title}>Profilim</Text>
        <Text style={styles.row}><Text style={styles.key}>Ad: </Text>{customer?.name}</Text>
        <Text style={styles.row}><Text style={styles.key}>E-posta: </Text>{customer?.email}</Text>
        <Text style={styles.row}><Text style={styles.key}>Telefon: </Text>{customer?.phone}</Text>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cikis Yap</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Kayitli Adresler</Text>
          <Pressable style={styles.addButton} onPress={() => setShowForm((prev) => !prev)}>
            <Text style={styles.addButtonText}>{showForm ? 'Kapat' : 'Yeni Adres'}</Text>
          </Pressable>
        </View>

        {showForm && (
          <View style={styles.formBox}>
            <TextInput
              style={styles.input}
              placeholder="Etiket (Ev/Is)"
              value={form.label}
              onChangeText={(value) => setForm((prev) => ({ ...prev, label: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Adres"
              value={form.address}
              onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Latitude"
              keyboardType="decimal-pad"
              value={form.latitude}
              onChangeText={(value) => setForm((prev) => ({ ...prev, latitude: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Longitude"
              keyboardType="decimal-pad"
              value={form.longitude}
              onChangeText={(value) => setForm((prev) => ({ ...prev, longitude: value }))}
            />
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setForm((prev) => ({ ...prev, isDefault: !prev.isDefault }))}
            >
              <View style={[styles.checkbox, form.isDefault && styles.checkboxActive]} />
              <Text style={styles.checkboxText}>Varsayilan adres olsun</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleAddAddress}>
              <Text style={styles.saveText}>Adresi Kaydet</Text>
            </Pressable>
          </View>
        )}

        {addresses.length === 0 ? (
          <Text style={styles.emptyText}>Kayitli adres bulunamadi</Text>
        ) : (
          addresses.map((address) => (
            <View key={address.id} style={[styles.addressCard, address.isDefault && styles.addressCardDefault]}>
              <Text style={styles.addressTitle}>
                {address.label}
                {address.isDefault ? ' (Varsayilan)' : ''}
              </Text>
              <Text style={styles.addressText}>{address.address}</Text>
              <Text style={styles.coordText}>{address.latitude.toFixed(5)}, {address.longitude.toFixed(5)}</Text>
              <View style={styles.addressActions}>
                {!address.isDefault && (
                  <Pressable style={styles.actionBlue} onPress={() => handleSetDefault(address.id)}>
                    <Text style={styles.actionText}>Varsayilan Yap</Text>
                  </Pressable>
                )}
                <Pressable style={styles.actionRed} onPress={() => handleDeleteAddress(address.id)}>
                  <Text style={styles.actionText}>Sil</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Siparislerim</Text>
        {orders.length === 0 ? (
          <Text style={styles.emptyText}>Siparis yok</Text>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
              <Text style={styles.orderMeta}>Durum: {order.status}</Text>
              <Text style={styles.orderMeta}>Tutar: {Number(order.orderAmount).toFixed(2)} TL</Text>
              <Text style={styles.orderMeta}>Tarih: {new Date(order.createdAt).toLocaleString('tr-TR')}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', padding: 14 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  row: { color: '#334155', marginBottom: 4 },
  key: { fontWeight: '700' },
  logoutButton: {
    marginTop: 10,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10
  },
  logoutText: { color: '#fff', fontWeight: '700' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  addButton: { backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  formBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: '#fff'
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#94a3b8',
    marginRight: 8
  },
  checkboxActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkboxText: { color: '#334155' },
  saveButton: { backgroundColor: '#16a34a', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  saveText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: '#64748b', marginTop: 8 },
  addressCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 10,
    marginTop: 8
  },
  addressCardDefault: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  addressTitle: { fontWeight: '700', color: '#0f172a' },
  addressText: { color: '#334155', marginTop: 2 },
  coordText: { color: '#64748b', fontSize: 12, marginTop: 2 },
  addressActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBlue: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8 },
  actionRed: { backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  orderCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginTop: 8
  },
  orderNumber: { fontWeight: '700', color: '#0f172a' },
  orderMeta: { color: '#475569', marginTop: 2, fontSize: 12 }
});
