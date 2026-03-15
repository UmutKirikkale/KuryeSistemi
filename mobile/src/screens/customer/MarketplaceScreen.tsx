import React, { useEffect, useMemo, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CustomerTabParamList } from '../../navigation/types';
import {
  marketplaceService,
  MarketplaceMenuItem,
  MarketplaceMenuResponse,
  MarketplaceRestaurant
} from '../../services/marketplaceService';
import { customerService, SavedAddress } from '../../services/customerService';
import { useCustomerStore } from '../../store/customerStore';

type CustomerNav = BottomTabNavigationProp<CustomerTabParamList, 'Marketplace'>;

type CartMap = Record<string, number>;

export default function MarketplaceScreen() {
  const navigation = useNavigation<CustomerNav>();
  const { customer } = useCustomerStore();
  const [restaurants, setRestaurants] = useState<MarketplaceRestaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [menuData, setMenuData] = useState<MarketplaceMenuResponse | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartMap>({});

  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRestaurantsAndAddresses = async () => {
    try {
      setError(null);
      const [restaurantsRes, profileRes] = await Promise.all([
        marketplaceService.getRestaurants(),
        customerService.getProfile()
      ]);

      setRestaurants(restaurantsRes.restaurants);
      if (!selectedRestaurantId && restaurantsRes.restaurants.length > 0) {
        setSelectedRestaurantId(restaurantsRes.restaurants[0].id);
      }

      const savedAddresses = profileRes.customer.savedAddresses;
      setAddresses(savedAddresses);
      const defaultAddress = savedAddresses.find((address) => address.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (savedAddresses.length > 0) {
        setSelectedAddressId(savedAddresses[0].id);
      }
    } catch {
      setError('Marketplace verileri yuklenemedi');
    } finally {
      setLoadingRestaurants(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadRestaurantsAndAddresses();
  }, []);

  useEffect(() => {
    if (!selectedRestaurantId) {
      setMenuData(null);
      return;
    }

    const loadMenu = async () => {
      try {
        setLoadingMenu(true);
        setError(null);
        const response = await marketplaceService.getRestaurantMenu(selectedRestaurantId);
        setMenuData(response);
        setCart({});
      } catch {
        setError('Menu yuklenemedi');
      } finally {
        setLoadingMenu(false);
      }
    };

    void loadMenu();
  }, [selectedRestaurantId]);

  const allItems = useMemo<MarketplaceMenuItem[]>(() => {
    if (!menuData) return [];
    return [...menuData.categories.flatMap((category) => category.menuItems), ...menuData.uncategorizedItems];
  }, [menuData]);

  const menuItemMap = useMemo(() => new Map(allItems.map((item) => [item.id, item])), [allItems]);

  const cartRows = useMemo(() => {
    return Object.entries(cart)
      .filter(([, quantity]) => quantity > 0)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity, item: menuItemMap.get(menuItemId) }))
      .filter((row): row is { menuItemId: string; quantity: number; item: MarketplaceMenuItem } => Boolean(row.item));
  }, [cart, menuItemMap]);

  const cartTotal = useMemo(
    () => cartRows.reduce((sum, row) => sum + row.item.price * row.quantity, 0),
    [cartRows]
  );

  const updateCartItem = (menuItemId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[menuItemId];
        return next;
      }
      return { ...prev, [menuItemId]: quantity };
    });
  };

  const handleCheckout = async () => {
    if (!selectedRestaurantId) {
      Alert.alert('Uyari', 'Lutfen restoran secin');
      return;
    }
    if (!selectedAddressId) {
      Alert.alert('Uyari', 'Lutfen teslimat adresi secin');
      return;
    }
    if (cartRows.length === 0) {
      Alert.alert('Uyari', 'Sepet bos');
      return;
    }

    try {
      setCheckoutLoading(true);
      setError(null);

      const payload = {
        restaurantId: selectedRestaurantId,
        savedAddressId: selectedAddressId,
        items: cartRows.map((row) => ({ menuItemId: row.menuItemId, quantity: row.quantity })),
        notes: notes.trim() || undefined
      };

      const response = await marketplaceService.createOrder(payload);
      setCart({});
      setNotes('');

      Alert.alert('Basarili', `Siparis alindi: ${response.order.orderNumber}`);
      navigation.navigate('CustomerOrderTracking', { orderNumber: response.order.orderNumber });
    } catch (checkoutError: any) {
      const message = checkoutError?.response?.data?.error || 'Siparis gonderilemedi';
      setError(message);
      Alert.alert('Hata', message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const renderMenuItem = (item: MarketplaceMenuItem) => {
    const quantity = cart[item.id] || 0;
    return (
      <View key={item.id} style={styles.menuItemCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          {!!item.description && <Text style={styles.menuItemDesc}>{item.description}</Text>}
          <Text style={styles.menuItemPrice}>{Number(item.price).toFixed(2)} TL</Text>
        </View>

        <View style={styles.qtyWrap}>
          <Pressable style={styles.qtyButton} onPress={() => updateCartItem(item.id, quantity - 1)}>
            <Text style={styles.qtyText}>-</Text>
          </Pressable>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <Pressable style={styles.qtyButton} onPress={() => updateCartItem(item.id, quantity + 1)}>
            <Text style={styles.qtyText}>+</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadRestaurantsAndAddresses(); }} />}
    >
      <Text style={styles.pageTitle}>Marketplace</Text>
      <Text style={styles.pageSubtitle}>Hos geldin, {customer?.name || 'Musteri'}</Text>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Restoranlar</Text>
        {loadingRestaurants ? (
          <ActivityIndicator color="#2563eb" />
        ) : restaurants.length === 0 ? (
          <Text style={styles.emptyText}>Restoran bulunamadi</Text>
        ) : (
          restaurants.map((restaurant) => (
            <Pressable
              key={restaurant.id}
              style={[
                styles.restaurantCard,
                selectedRestaurantId === restaurant.id && styles.restaurantCardActive
              ]}
              onPress={() => setSelectedRestaurantId(restaurant.id)}
            >
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <Text style={styles.restaurantMeta}>{restaurant.address}</Text>
              <Text style={styles.restaurantMeta}>{restaurant.availableMenuItemCount} urun</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu</Text>
        {loadingMenu ? (
          <ActivityIndicator color="#2563eb" />
        ) : !menuData ? (
          <Text style={styles.emptyText}>Restoran seciniz</Text>
        ) : (
          <>
            {menuData.categories.map((category) => (
              <View key={category.id} style={{ marginBottom: 10 }}>
                <Text style={styles.categoryTitle}>{category.name}</Text>
                {category.menuItems.length === 0 ? (
                  <Text style={styles.emptyText}>Bu kategoride urun yok</Text>
                ) : (
                  category.menuItems.map(renderMenuItem)
                )}
              </View>
            ))}

            {menuData.uncategorizedItems.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.categoryTitle}>Diger</Text>
                {menuData.uncategorizedItems.map(renderMenuItem)}
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Teslimat ve Sepet</Text>

        <Text style={styles.inputLabel}>Teslimat Adresi</Text>
        {addresses.length === 0 ? (
          <Text style={styles.emptyText}>Profil sekmesinden adres ekleyin</Text>
        ) : (
          addresses.map((address) => (
            <Pressable
              key={address.id}
              style={[styles.addressCard, selectedAddressId === address.id && styles.addressCardActive]}
              onPress={() => setSelectedAddressId(address.id)}
            >
              <Text style={styles.addressTitle}>{address.label}{address.isDefault ? ' (Varsayilan)' : ''}</Text>
              <Text style={styles.addressText}>{address.address}</Text>
            </Pressable>
          ))
        )}

        <TextInput
          style={[styles.input, { minHeight: 72 }]}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Siparis notu (opsiyonel)"
          textAlignVertical="top"
        />

        {cartRows.length === 0 ? (
          <Text style={styles.emptyText}>Sepet bos</Text>
        ) : (
          <View style={styles.cartBox}>
            {cartRows.map((row) => (
              <View key={row.menuItemId} style={styles.cartRow}>
                <Text style={styles.cartText}>{row.quantity}x {row.item.name}</Text>
                <Text style={styles.cartText}>{(row.item.price * row.quantity).toFixed(2)} TL</Text>
              </View>
            ))}
            <Text style={styles.cartTotal}>Toplam: {cartTotal.toFixed(2)} TL</Text>
          </View>
        )}

        <Pressable
          style={[styles.checkoutButton, checkoutLoading && styles.disabledButton]}
          onPress={handleCheckout}
          disabled={checkoutLoading}
        >
          {checkoutLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutText}>Siparisi Tamamla</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', padding: 14 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  pageSubtitle: { color: '#64748b', marginTop: 4, marginBottom: 10 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  errorText: { color: '#b91c1c', marginBottom: 8 },
  emptyText: { color: '#64748b', fontSize: 12 },
  restaurantCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8
  },
  restaurantCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  restaurantName: { fontWeight: '700', color: '#0f172a' },
  restaurantMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  categoryTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  menuItemCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  menuItemName: { fontWeight: '700', color: '#0f172a' },
  menuItemDesc: { color: '#64748b', fontSize: 12, marginTop: 2 },
  menuItemPrice: { color: '#2563eb', fontWeight: '700', marginTop: 4 },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  qtyText: { color: '#fff', fontWeight: '700', fontSize: 16, lineHeight: 18 },
  qtyValue: { minWidth: 18, textAlign: 'center', fontWeight: '700' },
  inputLabel: { color: '#334155', fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    backgroundColor: '#fff'
  },
  addressCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8
  },
  addressCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  addressTitle: { fontWeight: '700', color: '#0f172a' },
  addressText: { color: '#475569', fontSize: 12, marginTop: 2 },
  cartBox: { borderTopWidth: 1, borderColor: '#e2e8f0', marginTop: 4, paddingTop: 8 },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cartText: { color: '#334155' },
  cartTotal: { marginTop: 6, fontWeight: '700', color: '#0f172a' },
  checkoutButton: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10
  },
  checkoutText: { color: '#fff', fontWeight: '700' },
  disabledButton: { opacity: 0.6 }
});
