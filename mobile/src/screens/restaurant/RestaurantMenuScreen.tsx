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
import { restaurantService, RestaurantMenuCategory, RestaurantMenuItem } from '../../services/restaurantService';

export default function RestaurantMenuScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<RestaurantMenuCategory[]>([]);
  const [uncategorizedItems, setUncategorizedItems] = useState<RestaurantMenuItem[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [itemForm, setItemForm] = useState({ name: '', description: '', price: '', categoryId: '' });

  const load = useCallback(async () => {
    try {
      const response = await restaurantService.getMenu();
      setCategories(response.categories || []);
      setUncategorizedItems(response.uncategorizedItems || []);
    } catch {
      Alert.alert('Hata', 'Menu verisi yuklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Eksik Bilgi', 'Kategori adi zorunlu');
      return;
    }
    setSaving(true);
    try {
      await restaurantService.createCategory({ name: categoryName.trim() });
      setCategoryName('');
      await load();
    } catch {
      Alert.alert('Hata', 'Kategori olusturulamadi');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateItem = async () => {
    const price = Number(itemForm.price);
    if (!itemForm.name.trim() || !price || price <= 0) {
      Alert.alert('Eksik Bilgi', 'Urun adi ve gecerli fiyat gerekli');
      return;
    }

    setSaving(true);
    try {
      await restaurantService.createMenuItem({
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || undefined,
        price,
        categoryId: itemForm.categoryId || null
      });
      setItemForm({ name: '', description: '', price: '', categoryId: '' });
      await load();
    } catch {
      Alert.alert('Hata', 'Urun olusturulamadi');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (item: RestaurantMenuItem) => {
    try {
      await restaurantService.updateMenuItem(item.id, { isAvailable: !item.isAvailable });
      await load();
    } catch {
      Alert.alert('Hata', 'Urun durumu guncellenemedi');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await restaurantService.deleteCategory(categoryId);
      await load();
    } catch {
      Alert.alert('Hata', 'Kategori silinemedi');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await restaurantService.deleteMenuItem(itemId);
      await load();
    } catch {
      Alert.alert('Hata', 'Urun silinemedi');
    }
  };

  const renderItemCard = (item: RestaurantMenuItem) => (
    <View key={item.id} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          {!!item.description && <Text style={styles.itemDescription}>{item.description}</Text>}
        </View>
        <Text style={styles.itemPrice}>{Number(item.price).toFixed(2)} ₺</Text>
      </View>
      <View style={styles.itemActions}>
        <Pressable style={[styles.smallButton, item.isAvailable ? styles.green : styles.orange]} onPress={() => handleToggleAvailability(item)}>
          <Text style={styles.smallButtonText}>{item.isAvailable ? 'Aktif' : 'Pasif'}</Text>
        </Pressable>
        <Pressable style={[styles.smallButton, styles.red]} onPress={() => handleDeleteItem(item.id)}>
          <Text style={styles.smallButtonText}>Sil</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.root}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <Text style={styles.title}>Menu Yonetimi</Text>
      <Text style={styles.subtitle}>Web paneldeki menu operasyonlarinin mobil ozeti</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kategori Ekle</Text>
            <TextInput style={styles.input} placeholder="Kategori adi" value={categoryName} onChangeText={setCategoryName} />
            <Pressable style={[styles.primaryButton, saving && styles.disabled]} onPress={handleCreateCategory} disabled={saving}>
              <Text style={styles.primaryText}>Kategori Olustur</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Urun Ekle</Text>
            <TextInput style={styles.input} placeholder="Urun adi" value={itemForm.name} onChangeText={(value) => setItemForm((prev) => ({ ...prev, name: value }))} />
            <TextInput style={styles.input} placeholder="Aciklama" value={itemForm.description} onChangeText={(value) => setItemForm((prev) => ({ ...prev, description: value }))} />
            <TextInput style={styles.input} placeholder="Fiyat" value={itemForm.price} onChangeText={(value) => setItemForm((prev) => ({ ...prev, price: value }))} keyboardType="decimal-pad" />
            <TextInput style={styles.input} placeholder="Kategori ID (opsiyonel)" value={itemForm.categoryId} onChangeText={(value) => setItemForm((prev) => ({ ...prev, categoryId: value }))} />
            <Pressable style={[styles.primaryButton, saving && styles.disabled]} onPress={handleCreateItem} disabled={saving}>
              <Text style={styles.primaryText}>Urun Olustur</Text>
            </Pressable>
          </View>

          {uncategorizedItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kategorisiz Urunler</Text>
              {uncategorizedItems.map(renderItemCard)}
            </View>
          )}

          {categories.map((category) => (
            <View key={category.id} style={styles.section}>
              <View style={styles.categoryHeader}>
                <Text style={styles.sectionTitle}>{category.name}</Text>
                <Pressable style={[styles.smallButton, styles.red]} onPress={() => handleDeleteCategory(category.id)}>
                  <Text style={styles.smallButtonText}>Sil</Text>
                </Pressable>
              </View>
              {category.menuItems.length === 0 ? (
                <Text style={styles.empty}>Bu kategoride urun yok</Text>
              ) : (
                category.menuItems.map(renderItemCard)
              )}
            </View>
          ))}
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  primaryButton: { backgroundColor: '#1d4ed8', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginTop: 10, backgroundColor: '#f8fafc' },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemTitle: { fontWeight: '700', color: '#0f172a' },
  itemDescription: { color: '#64748b', fontSize: 12, marginTop: 2 },
  itemPrice: { fontWeight: '700', color: '#1d4ed8' },
  itemActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  smallButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  green: { backgroundColor: '#16a34a' },
  orange: { backgroundColor: '#d97706' },
  red: { backgroundColor: '#dc2626' },
  empty: { color: '#94a3b8' }
});
