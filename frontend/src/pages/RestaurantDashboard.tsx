import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useLocationStore } from '../store/locationStore';
import { wsService } from '../services/websocket';
import { restaurantService } from '../services/restaurantService';
import { locationService } from '../services/locationService';
import { financialService } from '../services/financialService';
import { orderService } from '../services/orderService';
import {
  LogOut,
  Package,
  DollarSign,
  TrendingUp,
  MapPin,
  Plus,
  Settings,
  X,
  Camera
} from 'lucide-react';
import MapComponent from '../components/MapComponent';
import LocationPickerMap from '../components/LocationPickerMap';
import CreateOrderModal from '../components/CreateOrderModal';
import OCROrderModal from '../components/OCROrderModal';
import OrderList from '../components/OrderList';
import FinancialSummary from '../components/FinancialSummary';

interface RestaurantMenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  sortOrder: number;
  categoryId?: string | null;
}

interface RestaurantMenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  menuItems: RestaurantMenuItem[];
}

interface RestaurantHistoryOrder {
  id: string;
  orderNumber: string;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  orderAmount: number;
  customerName: string;
  customerPhone: string;
  paymentMethod?: 'CASH' | 'CARD';
  sourcePlatform?: string;
  externalOrderId?: string;
  createdAt: string;
}

export default function RestaurantDashboard() {
  const { user, logout } = useAuthStore();
  const { orders, fetchOrders } = useOrderStore();
  const { courierLocations, setCourierLocations, updateCourierLocation } = useLocationStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAllOrdersModal, setShowAllOrdersModal] = useState(false);
  const [restaurantLocation, setRestaurantLocation] = useState<[number, number]>([35.1264, 33.4299]);
  const [tempLocation, setTempLocation] = useState<[number, number]>([35.1264, 33.4299]);
  const [financialData, setFinancialData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'map' | 'financial' | 'menu'>('orders');
  const [savingLocation, setSavingLocation] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuCategories, setMenuCategories] = useState<RestaurantMenuCategory[]>([]);
  const [uncategorizedItems, setUncategorizedItems] = useState<RestaurantMenuItem[]>([]);
  const [orderHistory, setOrderHistory] = useState<RestaurantHistoryOrder[]>([]);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [orderHistoryPage, setOrderHistoryPage] = useState(1);
  const [orderHistoryTotalPages, setOrderHistoryTotalPages] = useState(1);
  const [orderHistoryTotal, setOrderHistoryTotal] = useState(0);
  const [orderHistoryQuery, setOrderHistoryQuery] = useState('');
  const [orderHistoryStatus, setOrderHistoryStatus] = useState('ALL');
  const [orderHistoryPlatform, setOrderHistoryPlatform] = useState('ALL');
  const [categoryName, setCategoryName] = useState('');
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: 0,
    categoryId: ''
  });

  useEffect(() => {
    // Siparişleri yükle
    fetchOrders();

    // Restoran profilini ve kurye konumlarını yükle
    loadRestaurantProfile();
    loadCourierLocations();

    // Finansal verileri yükle
    loadFinancialData();
    loadMenuData();

    // WebSocket dinleyicilerini kur
    wsService.onLocationUpdate((data) => {
      updateCourierLocation({
        courierId: data.courierId,
        courierName: '',
        latitude: data.latitude,
        longitude: data.longitude
      });
    });

    wsService.onOrderStatusUpdate(() => {
      // Siparişleri yeniden yükle
      fetchOrders();
    });

    wsService.onNewOrder(() => {
      // Yeni sipariş bildirimi (genellikle kurye için)
    });

    return () => {
      // Cleanup
    };
  }, []);

  const loadRestaurantProfile = async () => {
    try {
      const response = await restaurantService.getProfile();
      if (response.restaurant.latitude && response.restaurant.longitude) {
        const location: [number, number] = [response.restaurant.latitude, response.restaurant.longitude];
        setRestaurantLocation(location);
        setTempLocation(location);
      }
    } catch (error) {
      console.error('Failed to load restaurant profile:', error);
    }
  };

  const loadCourierLocations = async () => {
    try {
      const response = await locationService.getCourierLocations();
      setCourierLocations(response.couriers || []);
    } catch (error) {
      console.error('Failed to load courier locations:', error);
    }
  };

  const loadFinancialData = async () => {
    try {
      const response = await financialService.getRestaurantFinancials();
      setFinancialData(response);
    } catch (error) {
      console.error('Failed to load financial data:', error);
    }
  };

  const handleSaveLocation = async () => {
    setSavingLocation(true);
    try {
      await restaurantService.updateLocation(tempLocation[0], tempLocation[1]);
      setRestaurantLocation(tempLocation);
      setShowLocationModal(false);
      alert('✅ Restoran konumu başarıyla güncellendi!');
    } catch (error) {
      console.error('Failed to save location:', error);
      alert('❌ Konum kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const loadMenuData = async () => {
    try {
      setMenuLoading(true);
      const response = await restaurantService.getMenu();
      setMenuCategories(response.categories || []);
      setUncategorizedItems(response.uncategorizedItems || []);
    } catch (error) {
      console.error('Failed to load menu data:', error);
    } finally {
      setMenuLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      alert('Kategori adı zorunludur');
      return;
    }

    try {
      await restaurantService.createCategory({ name: categoryName.trim() });
      setCategoryName('');
      await loadMenuData();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Kategori oluşturulamadı');
    }
  };

  const handleDeleteCategory = async (categoryId: string, name: string) => {
    if (!window.confirm(`${name} kategorisi silinsin mi?`)) {
      return;
    }

    try {
      await restaurantService.deleteCategory(categoryId);
      await loadMenuData();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Kategori silinemedi');
    }
  };

  const handleCreateItem = async () => {
    if (!itemForm.name.trim() || itemForm.price <= 0) {
      alert('Ürün adı ve fiyat zorunludur');
      return;
    }

    try {
      await restaurantService.createMenuItem({
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || undefined,
        price: itemForm.price,
        categoryId: itemForm.categoryId || null
      });

      setItemForm({
        name: '',
        description: '',
        price: 0,
        categoryId: ''
      });

      await loadMenuData();
    } catch (error) {
      console.error('Failed to create menu item:', error);
      alert('Ürün oluşturulamadı');
    }
  };

  const handleToggleItemAvailability = async (item: RestaurantMenuItem) => {
    try {
      await restaurantService.updateMenuItem(item.id, { isAvailable: !item.isAvailable });
      await loadMenuData();
    } catch (error) {
      console.error('Failed to toggle item availability:', error);
      alert('Ürün durumu güncellenemedi');
    }
  };

  const handleEditItem = async (item: RestaurantMenuItem) => {
    const nextName = window.prompt('Yeni ürün adı', item.name);
    if (nextName === null || !nextName.trim()) {
      return;
    }

    const priceInput = window.prompt('Yeni fiyat', item.price.toString());
    if (priceInput === null) {
      return;
    }

    const nextPrice = Number(priceInput);
    if (Number.isNaN(nextPrice) || nextPrice <= 0) {
      alert('Geçerli bir fiyat girin');
      return;
    }

    try {
      await restaurantService.updateMenuItem(item.id, {
        name: nextName.trim(),
        price: nextPrice
      });
      await loadMenuData();
    } catch (error) {
      console.error('Failed to edit item:', error);
      alert('Ürün güncellenemedi');
    }
  };

  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!window.confirm(`${name} ürünü silinsin mi?`)) {
      return;
    }

    try {
      await restaurantService.deleteMenuItem(itemId);
      await loadMenuData();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Ürün silinemedi');
    }
  };

  const fetchOrderHistory = async (page = 1) => {
    try {
      setOrderHistoryLoading(true);
      const response = await orderService.getOrders({ page, limit: 25 });
      setOrderHistory(response.orders || []);
      setOrderHistoryPage(response.pagination?.page || page);
      setOrderHistoryTotalPages(response.pagination?.pages || 1);
      setOrderHistoryTotal(response.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load order history:', error);
      setOrderHistory([]);
      setOrderHistoryTotal(0);
      setOrderHistoryTotalPages(1);
    } finally {
      setOrderHistoryLoading(false);
    }
  };

  const handleOpenAllOrders = async () => {
    setShowAllOrdersModal(true);
    await fetchOrderHistory(1);
  };

  const filteredOrderHistory = useMemo(() => {
    const normalizedQuery = orderHistoryQuery.trim().toLowerCase();

    return orderHistory.filter((order) => {
      const statusOk = orderHistoryStatus === 'ALL' || order.status === orderHistoryStatus;
      const platformOk = orderHistoryPlatform === 'ALL' || (order.sourcePlatform || '') === orderHistoryPlatform;
      if (!statusOk || !platformOk) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${order.orderNumber} ${order.customerName} ${order.customerPhone} ${order.pickupAddress} ${order.deliveryAddress} ${order.sourcePlatform || ''} ${order.externalOrderId || ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [orderHistory, orderHistoryPlatform, orderHistoryQuery, orderHistoryStatus]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.restaurant?.name || 'Restoran Paneli'}
              </h1>
              <p className="text-sm text-gray-600">Hoş geldiniz, {user?.name}</p>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Sipariş</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orders.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Brüt Gelir</p>
                <p className="text-2xl font-bold text-gray-900">
                  {financialData?.summary.totalEarnings.toFixed(2) || '0.00'} ₺
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Komisyon</p>
                <p className="text-2xl font-bold text-gray-900">
                  {financialData?.summary.totalCommissions?.toFixed(2) || '0.00'} ₺
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Bakiye</p>
                <p className="text-2xl font-bold text-gray-900">
                  {financialData?.summary.netBalance.toFixed(2) || '0.00'} ₺
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b">
            <div className="flex gap-4 px-6">
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'orders'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Siparişler
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`py-4 px-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'map'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                Harita
              </button>
              <button
                onClick={() => setActiveTab('financial')}
                className={`py-4 px-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'financial'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Finansal Rapor
              </button>
              <button
                onClick={() => setActiveTab('menu')}
                className={`py-4 px-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'menu'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Menü Yönetimi
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'orders' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">Siparişler</h2>
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-700 border border-red-200">
                      Toplam Komisyon: {(financialData?.summary.totalCommissions || 0).toFixed(2)} ₺
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleOpenAllOrders}
                      className="btn btn-secondary"
                    >
                      Tüm Sipariş Geçmişi
                    </button>
                    <button
                      onClick={() => setShowOCRModal(true)}
                      className="btn btn-primary flex items-center gap-2"
                      title="Fotoğraftan Sipariş Oluştur"
                    >
                      <Camera className="w-4 h-4" />
                      Fotoğraf ile
                    </button>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Yeni Sipariş
                    </button>
                  </div>
                </div>
                <OrderList orders={orders} role="RESTAURANT" />
              </div>
            )}

            {activeTab === 'map' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Canlı Kurye Takibi</h2>
                  <button
                    onClick={() => setShowLocationModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Konum Ayarla
                  </button>
                </div>

                {courierLocations.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
                    <p className="text-yellow-800 text-center">
                      📍 Şu anda aktif teslimat yapan kurye bulunmuyor
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      🚴 <strong>{courierLocations.length}</strong> kurye aktif teslimat yapıyor
                    </p>
                  </div>
                )}

                <div className="h-[600px] rounded-lg overflow-hidden">
                  <MapComponent 
                    courierLocations={courierLocations}
                    center={restaurantLocation}
                  />
                </div>
              </div>
            )}

            {activeTab === 'financial' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Finansal Rapor</h2>
                <FinancialSummary data={financialData} />
              </div>
            )}

            {activeTab === 'menu' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Menü Yönetimi</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Kategori Ekle</h3>
                    <div className="flex gap-2">
                      <input
                        value={categoryName}
                        onChange={(event) => setCategoryName(event.target.value)}
                        placeholder="Kategori adı"
                        className="input"
                      />
                      <button
                        onClick={handleCreateCategory}
                        className="btn btn-primary"
                      >
                        Ekle
                      </button>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-2">
                    <h3 className="font-semibold mb-3">Ürün Ekle</h3>
                    <input
                      value={itemForm.name}
                      onChange={(event) => setItemForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Ürün adı"
                      className="input"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemForm.price}
                      onChange={(event) => setItemForm((prev) => ({ ...prev, price: Number(event.target.value) }))}
                      placeholder="Fiyat"
                      className="input"
                    />
                    <input
                      value={itemForm.description}
                      onChange={(event) => setItemForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Açıklama (opsiyonel)"
                      className="input"
                    />
                    <select
                      aria-label="Ürün kategorisi"
                      title="Ürün kategorisi"
                      value={itemForm.categoryId}
                      onChange={(event) => setItemForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                      className="input"
                    >
                      <option value="">Kategorisiz</option>
                      {menuCategories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleCreateItem}
                      className="btn btn-primary w-full"
                    >
                      Ürün Oluştur
                    </button>
                  </div>
                </div>

                {menuLoading ? (
                  <div className="text-sm text-gray-500">Menü yükleniyor...</div>
                ) : (
                  <div className="space-y-4">
                    {menuCategories.map((category) => (
                      <div key={category.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">{category.name}</h3>
                          <button
                            onClick={() => handleDeleteCategory(category.id, category.name)}
                            className="text-sm px-3 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                          >
                            Kategoriyi Sil
                          </button>
                        </div>

                        {category.menuItems.length === 0 ? (
                          <p className="text-sm text-gray-500">Bu kategoride ürün yok.</p>
                        ) : (
                          <div className="space-y-2">
                            {category.menuItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between rounded border px-3 py-2">
                                <div>
                                  <p className="font-medium text-gray-900">{item.name}</p>
                                  <p className="text-xs text-gray-500">{item.price.toFixed(2)} ₺</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleItemAvailability(item)}
                                    className={`text-xs px-2 py-1 rounded ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                                  >
                                    {item.isAvailable ? 'Aktif' : 'Pasif'}
                                  </button>
                                  <button
                                    onClick={() => handleEditItem(item)}
                                    className="text-xs px-2 py-1 rounded border border-gray-300"
                                  >
                                    Düzenle
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id, item.name)}
                                    className="text-xs px-2 py-1 rounded border border-red-200 text-red-600"
                                  >
                                    Sil
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Kategorisiz Ürünler</h3>
                      {uncategorizedItems.length === 0 ? (
                        <p className="text-sm text-gray-500">Kategorisiz ürün yok.</p>
                      ) : (
                        <div className="space-y-2">
                          {uncategorizedItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between rounded border px-3 py-2">
                              <div>
                                <p className="font-medium text-gray-900">{item.name}</p>
                                <p className="text-xs text-gray-500">{item.price.toFixed(2)} ₺</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleItemAvailability(item)}
                                  className={`text-xs px-2 py-1 rounded ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                                >
                                  {item.isAvailable ? 'Aktif' : 'Pasif'}
                                </button>
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="text-xs px-2 py-1 rounded border border-gray-300"
                                >
                                  Düzenle
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id, item.name)}
                                  className="text-xs px-2 py-1 rounded border border-red-200 text-red-600"
                                >
                                  Sil
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchOrders();
            loadFinancialData();
          }}
        />
      )}

      {/* Location Settings Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="w-6 h-6 text-indigo-600" />
                <h3 className="text-xl font-bold text-gray-900">Restoran Konumu Ayarla</h3>
              </div>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setTempLocation(restaurantLocation);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Kapat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <LocationPickerMap
                initialPosition={restaurantLocation}
                onLocationSelect={(lat, lng) => setTempLocation([lat, lng])}
                height="500px"
              />
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex space-x-3">
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setTempLocation(restaurantLocation);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSaveLocation}
                disabled={savingLocation}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingLocation ? 'Kaydediliyor...' : 'Konumu Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOCRModal && (
        <OCROrderModal
          onClose={() => setShowOCRModal(false)}
          onSuccess={() => {
            setShowOCRModal(false);
            fetchOrders();
            loadFinancialData();
          }}
        />
      )}

      {showAllOrdersModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Tüm Sipariş Geçmişi</h3>
                <p className="text-sm text-gray-600">Açılıştan bugüne toplam {orderHistoryTotal} sipariş</p>
              </div>
              <button
                onClick={() => setShowAllOrdersModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Kapat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-auto flex-1 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <input
                  type="text"
                  value={orderHistoryQuery}
                  onChange={(event) => setOrderHistoryQuery(event.target.value)}
                  placeholder="Sipariş no, müşteri, adres ara"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <select
                  value={orderHistoryStatus}
                  onChange={(event) => setOrderHistoryStatus(event.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="ALL">Tüm Durumlar</option>
                  <option value="PENDING">Bekliyor</option>
                  <option value="APPROVED">Onaylandı</option>
                  <option value="PREPARING">Hazırlanıyor</option>
                  <option value="ASSIGNED">Atandı</option>
                  <option value="PICKED_UP">Yolda</option>
                  <option value="DELIVERED">Teslim Edildi</option>
                  <option value="CANCELLED">İptal</option>
                </select>
                <select
                  value={orderHistoryPlatform}
                  onChange={(event) => setOrderHistoryPlatform(event.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="ALL">Tüm Platformlar</option>
                  <option value="FEEDME">Feedme</option>
                  <option value="YEMEKSEPETI">Yemeksepeti</option>
                </select>
              </div>

              {orderHistoryLoading ? (
                <p className="text-sm text-gray-500">Sipariş geçmişi yükleniyor...</p>
              ) : filteredOrderHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-10">Kayıt bulunamadı</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b bg-gray-50">
                      <th className="py-2 px-2">Tarih</th>
                      <th className="py-2 px-2">Sipariş No</th>
                      <th className="py-2 px-2">Durum</th>
                      <th className="py-2 px-2">Müşteri</th>
                      <th className="py-2 px-2">Alış Adresi</th>
                      <th className="py-2 px-2">Teslimat Adresi</th>
                      <th className="py-2 px-2">Platform</th>
                      <th className="py-2 px-2">Ödeme</th>
                      <th className="py-2 px-2">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrderHistory.map((order) => (
                      <tr key={order.id} className="border-b last:border-0 align-top">
                        <td className="py-2 px-2 whitespace-nowrap">{new Date(order.createdAt).toLocaleString('tr-TR')}</td>
                        <td className="py-2 px-2 font-medium">{order.orderNumber}</td>
                        <td className="py-2 px-2">{order.status}</td>
                        <td className="py-2 px-2">{order.customerName} ({order.customerPhone})</td>
                        <td className="py-2 px-2">{order.pickupAddress}</td>
                        <td className="py-2 px-2">{order.deliveryAddress}</td>
                        <td className="py-2 px-2">
                          {order.sourcePlatform || '-'}
                          {order.externalOrderId ? ` (${order.externalOrderId})` : ''}
                        </td>
                        <td className="py-2 px-2">{order.paymentMethod === 'CARD' ? 'Kart' : order.paymentMethod === 'CASH' ? 'Nakit' : '-'}</td>
                        <td className="py-2 px-2 font-semibold whitespace-nowrap">{order.orderAmount.toFixed(2)} ₺</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">Sayfa {orderHistoryPage} / {orderHistoryTotalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchOrderHistory(orderHistoryPage - 1)}
                  disabled={orderHistoryLoading || orderHistoryPage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-50"
                >
                  Önceki
                </button>
                <button
                  onClick={() => fetchOrderHistory(orderHistoryPage + 1)}
                  disabled={orderHistoryLoading || orderHistoryPage >= orderHistoryTotalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
