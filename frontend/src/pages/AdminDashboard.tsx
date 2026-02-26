import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
import { adminService } from '../services/adminService';
import { locationService } from '../services/locationService';
import { wsService } from '../services/websocket';
import { 
  Users, 
  Package, 
  TrendingUp, 
  DollarSign,
  MapPin,
  Store,
  Bike,
  BarChart3,
  Activity,
  UserPlus,
  X,
  List,
  Trash2
} from 'lucide-react';
import MapComponent from '../components/MapComponent';

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalRestaurants: number;
  totalCouriers: number;
  activeOrders: number;
  completedOrders: number;
  totalRevenue: number;
  todayRevenue: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod?: 'CASH' | 'CARD';
  orderAmount: number;
  courierFee: number;
  restaurant: {
    name: string;
  };
  courier?: {
    user: {
      name: string;
    };
  };
  createdAt: string;
}

interface Courier {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  vehicleType: string;
  available: boolean;
  currentLatitude?: number;
  currentLongitude?: number;
  paymentPerOrder: number;
  stats?: {
    deliveredOrders: number;
    busyToggles: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    busyTogglesLast7Days: Array<{
      date: string;
      count: number;
    }>;
  };
}

interface CourierPerformanceReport {
  courier: {
    id: string;
    name: string;
    email: string;
    paymentPerOrder: number;
  };
  summary: {
    totalAssigned: number;
    deliveredCount: number;
    cancelledCount: number;
    cancelRate: number;
    averageDeliveryMinutes: number;
    medianDeliveryMinutes: number;
    totalEarnings: number;
  };
  dailyEarnings: Array<{
    date: string;
    deliveries: number;
    earnings: number;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    deliveries: number;
  }>;
  weekdayDistribution: Array<{
    weekday: number;
    delivered: number;
    cancelled: number;
  }>;
  restaurantStats: Array<{
    restaurantName: string;
    deliveredCount: number;
    averageMinutes: number;
  }>;
  cancelReasons: Array<{
    reason: string;
    count: number;
  }>;
}

interface CourierSettlementClosingItem {
  id: string;
  amount: number;
  date: string;
  dayKey?: string | null;
  packageCount?: number | null;
  restaurant?: {
    id: string;
    name: string;
  } | null;
  courier?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface CourierSettlementClosingReport {
  summary: {
    totalRecords: number;
    totalClosedAmount: number;
    startDate?: string | null;
    endDate?: string | null;
  };
  settlements: CourierSettlementClosingItem[];
}

interface Restaurant {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  name: string;
  address: string;
  phone: string;
  commissionPerOrder: number;
}

interface DailyStat {
  date: string;
  orderCount: number;
  revenue: number;
  commission: number;
  netIncome: number;
}

interface FinancialReport {
  restaurant: {
    id: string;
    name: string;
    commissionPerOrder: number;
    owner: {
      name: string;
      email: string;
    };
  };
  period: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
    netIncome: number;
  };
  dailyStats: DailyStat[];
  orders: Order[];
}

interface SystemSettings {
  courierAutoBusyAfterOrders: number;
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const { courierLocations, updateCourierLocation, setCourierLocations } = useLocationStore();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalOrders: 0,
    totalRestaurants: 0,
    totalCouriers: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [todayTotalRevenue, setTodayTotalRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showCreateCourierModal, setShowCreateCourierModal] = useState(false);
  const [showCourierListModal, setShowCourierListModal] = useState(false);
  const [showCourierMapModal, setShowCourierMapModal] = useState(false);
  const [showCourierSettlementModal, setShowCourierSettlementModal] = useState(false);
  const [showCourierEditModal, setShowCourierEditModal] = useState(false);
  const [showCourierPerformanceModal, setShowCourierPerformanceModal] = useState(false);
  const [showCreateRestaurantModal, setShowCreateRestaurantModal] = useState(false);
  const [showRestaurantListModal, setShowRestaurantListModal] = useState(false);
  const [showRestaurantDetailModal, setShowRestaurantDetailModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [newCommission, setNewCommission] = useState<number>(0);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [autoBusyAfterOrders, setAutoBusyAfterOrders] = useState<number>(4);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [courierForm, setCourierForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    vehicleType: '',
    paymentPerOrder: 0
  });
  const [restaurantForm, setRestaurantForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    restaurantName: '',
    address: '',
    restaurantPhone: '',
    commissionPerOrder: 0
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [courierPerformance, setCourierPerformance] = useState<CourierPerformanceReport | null>(null);
  const [courierSettlementReport, setCourierSettlementReport] = useState<CourierSettlementClosingReport | null>(null);
  const [courierSettlementLoading, setCourierSettlementLoading] = useState(false);
  const [settlementStartDate, setSettlementStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [settlementEndDate, setSettlementEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceDays, setPerformanceDays] = useState<number>(7);
  const [editPaymentPerOrder, setEditPaymentPerOrder] = useState<number>(0);
  const [editVehicleType, setEditVehicleType] = useState<string>('');
  const [editIsAvailable, setEditIsAvailable] = useState<boolean>(false);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchSystemSettings();
    loadCourierLocations();

    const refreshInterval = window.setInterval(() => {
      loadCourierLocations();
    }, 15000);

    // WebSocket dinleyicilerini kur
    wsService.onLocationUpdate((data) => {
      updateCourierLocation({
        courierId: data.courierId,
        courierName: '',
        latitude: data.latitude,
        longitude: data.longitude
      });
    });

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [updateCourierLocation]);

  const loadCourierLocations = async () => {
    try {
      const response = await locationService.getCourierLocations();
      setCourierLocations(response.couriers || []);
    } catch (error) {
      console.error('Kurye konumlari yuklenemedi:', error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { settings } = await adminService.getSystemSettings();
      setSystemSettings(settings);
      setAutoBusyAfterOrders(settings.courierAutoBusyAfterOrders ?? 4);
    } catch (error) {
      console.error('Sistem ayarlari yuklenemedi:', error);
    }
  };

  const handleSaveSystemSettings = async () => {
    if (autoBusyAfterOrders < 1) {
      alert('Meşgule düşme sayısı en az 1 olmalıdır');
      return;
    }

    try {
      setSettingsSaving(true);
      const { settings } = await adminService.updateSystemSettings({
        courierAutoBusyAfterOrders: autoBusyAfterOrders
      });
      setSystemSettings(settings);
      alert('Ayarlar kaydedildi');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ayarlar kaydedilemedi';
      alert(message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const { stats } = await adminService.getDashboardStats();
      setStats(stats);
      
      // Son kullanıcıları al
      const { users } = await adminService.getAllUsers({ limit: 5 });
      setRecentUsers(users);
      
      // Son siparişleri al
      const { orders } = await adminService.getAllOrders({ limit: 5 });
      setRecentOrders(orders);
      
      setLoading(false);
    } catch (error) {
      console.error('Dashboard verisi yüklenemedi:', error);
      setLoading(false);
    }
  };

  const fetchCouriers = async () => {
    try {
      const { couriers } = await adminService.getAllCouriers();
      setCouriers(couriers);
    } catch (error) {
      console.error('Kuryeler yüklenemedi:', error);
    }
  };

  const handleOpenCourierList = async () => {
    setShowCourierListModal(true);
    await fetchCouriers();
  };

  const handleDeleteCourier = async (courierId: string, courierName: string) => {
    if (!window.confirm(`${courierName} kurye hesabını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    setDeleteLoading(courierId);
    try {
      await adminService.deleteCourier(courierId);
      // Listeyi güncelle
      await fetchCouriers();
      // Dashboard istatistiklerini güncelle
      await fetchDashboardData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Kurye silinemedi';
      alert(errorMessage);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleOpenCourierEdit = (courier: Courier) => {
    setSelectedCourier(courier);
    setEditPaymentPerOrder(courier.paymentPerOrder);
    setEditVehicleType(courier.vehicleType || '');
    setEditIsAvailable(courier.available);
    setShowCourierEditModal(true);
  };

  const handleOpenCourierPerformance = async (courier: Courier, days = performanceDays) => {
    setSelectedCourier(courier);
    setShowCourierPerformanceModal(true);
    setPerformanceLoading(true);
    try {
      const report = await adminService.getCourierPerformanceReport(courier.user.id, days);
      setCourierPerformance(report);
    } catch (error) {
      console.error('Kurye performans raporu yuklenemedi:', error);
      setCourierPerformance(null);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const fetchCourierSettlementClosings = async (startDate?: string, endDate?: string) => {
    try {
      setCourierSettlementLoading(true);
      const report = await adminService.getCourierSettlementClosings({
        startDate,
        endDate,
        limit: 500
      });
      setCourierSettlementReport(report);
    } catch (error) {
      console.error('Kurye hesap kapama raporu yuklenemedi:', error);
      setCourierSettlementReport(null);
    } finally {
      setCourierSettlementLoading(false);
    }
  };

  const handleOpenCourierSettlementReport = async () => {
    setShowCourierSettlementModal(true);
    await fetchCourierSettlementClosings(settlementStartDate, settlementEndDate);
  };

  const handleFilterCourierSettlementReport = async () => {
    await fetchCourierSettlementClosings(settlementStartDate, settlementEndDate);
  };

  const handleSaveCourierPayment = async () => {
    if (!selectedCourier) return;

    if (editPaymentPerOrder < 0) {
      alert('Ödeme tutarı 0 veya daha büyük olmalıdır');
      return;
    }

    try {
      setEditSaving(true);
      await adminService.updateCourier(selectedCourier.user.id, {
        paymentPerOrder: editPaymentPerOrder,
        vehicleType: editVehicleType || undefined,
        isAvailable: editIsAvailable
      });
      await fetchCouriers();
      setShowCourierEditModal(false);
      setSelectedCourier(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kurye bilgileri güncellenemedi';
      alert(message);
    } finally {
      setEditSaving(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const { restaurants, todayTotalRevenue } = await adminService.getAllRestaurants();
      setRestaurants(restaurants);
      setTodayTotalRevenue(todayTotalRevenue || 0);
    } catch (error) {
      console.error('Restoranlar yüklenemedi:', error);
    }
  };

  const handleOpenRestaurantList = async () => {
    setShowRestaurantListModal(true);
    await fetchRestaurants();
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      await adminService.createRestaurant(restaurantForm);
      setShowCreateRestaurantModal(false);
      setRestaurantForm({
        email: '',
        password: '',
        name: '',
        phone: '',
        restaurantName: '',
        address: '',
        restaurantPhone: '',
        commissionPerOrder: 0
      });
      // Verileri yenile
      fetchDashboardData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Restoran oluşturulamadı';
      setCreateError(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteRestaurant = async (restaurantId: string, restaurantName: string) => {
    if (!window.confirm(`${restaurantName} restoran hesabını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    setDeleteLoading(restaurantId);
    try {
      await adminService.deleteRestaurant(restaurantId);
      // Listeyi güncelle
      await fetchRestaurants();
      // Dashboard istatistiklerini güncelle
      await fetchDashboardData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Restoran silinemedi';
      alert(errorMessage);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleRestaurantClick = async (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setNewCommission(restaurant.commissionPerOrder);
    setShowRestaurantDetailModal(true);
    // Finansal raporu yükle
    await fetchFinancialReport(restaurant.id, reportPeriod);
  };

  const fetchFinancialReport = async (restaurantId: string, period: 'daily' | 'weekly' | 'monthly') => {
    try {
      const report = await adminService.getRestaurantFinancialReport(restaurantId, period);
      setFinancialReport(report);
    } catch (error) {
      console.error('Finansal rapor yüklenemedi:', error);
    }
  };

  const handleCommissionUpdate = async () => {
    if (!selectedRestaurant) return;
    
    if (newCommission < 0) {
      alert('Komisyon tutarı pozitif olmalıdır');
      return;
    }

    try {
      await adminService.updateRestaurantCommission(selectedRestaurant.id, newCommission);
      // Restoran listesini güncelle
      await fetchRestaurants();
      // Seçili restoranı güncelle
      if (selectedRestaurant) {
        setSelectedRestaurant({
          ...selectedRestaurant,
          commissionPerOrder: newCommission
        });
      }
      alert('Komisyon tutarı başarıyla güncellendi');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Komisyon güncellenemedi';
      alert(errorMessage);
    }
  };

  const handlePeriodChange = async (period: 'daily' | 'weekly' | 'monthly') => {
    setReportPeriod(period);
    if (selectedRestaurant) {
      await fetchFinancialReport(selectedRestaurant.id, period);
    }
  };

  const handleCreateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      await adminService.createCourier(courierForm);
      setShowCreateCourierModal(false);
      setCourierForm({
        email: '',
        password: '',
        name: '',
        phone: '',
        vehicleType: '',
        paymentPerOrder: 0
      });
      // Verileri yenile
      fetchDashboardData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Kurye oluşturulam adı';
      setCreateError(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  const weekdayLabels = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];

  const StatCard = ({ icon: Icon, title, value, subtitle, color }: {
    icon: React.ElementType;
    title: string;
    value: string | number;
    subtitle?: string;
    color: string;
  }) => (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-4 rounded-full ${color.replace('text-', 'bg-')}/10`}>
          <Icon className={`w-8 h-8 ${color}`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Yönetici Paneli</h1>
                <p className="text-sm text-gray-600">Hoş geldiniz, {user?.name}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            title="Toplam Kullanıcı"
            value={stats.totalUsers}
            subtitle={`${stats.totalRestaurants} Restoran, ${stats.totalCouriers} Kurye`}
            color="text-blue-600"
          />
          <StatCard
            icon={Package}
            title="Toplam Sipariş"
            value={stats.totalOrders}
            subtitle={`${stats.activeOrders} Aktif, ${stats.completedOrders} Tamamlandı`}
            color="text-green-600"
          />
          <StatCard
            icon={DollarSign}
            title="Toplam Komisyon"
            value={`₺${stats.totalRevenue.toLocaleString()}`}
            subtitle={`Bugün: ₺${stats.todayRevenue.toLocaleString()}`}
            color="text-emerald-600"
          />
          <StatCard
            icon={TrendingUp}
            title="Aktif Siparişler"
            value={stats.activeOrders}
            subtitle="Devam eden teslimatlar"
            color="text-orange-600"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Store className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Restoranlar</h3>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleOpenRestaurantList}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  title="Restoran Listesi"
                >
                  <List className="w-4 h-4" />
                  <span>Liste</span>
                </button>
                <button
                  onClick={() => setShowCreateRestaurantModal(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  title="Yeni Restoran Ekle"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Ekle</span>
                </button>
              </div>
            </div>
            <p className="text-3xl font-bold text-indigo-600">{stats.totalRestaurants}</p>
            <p className="text-sm text-gray-600 mt-2">Kayıtlı restoran sayısı</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center space-x-3">
                <Bike className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Kuryeler</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowCourierMapModal(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                  title="Kurye Haritası"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Harita</span>
                </button>
                <button
                  onClick={handleOpenCourierList}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm whitespace-nowrap"
                  title="Kurye Listesi"
                >
                  <List className="w-4 h-4" />
                  <span>Liste</span>
                </button>
                <button
                  onClick={handleOpenCourierSettlementReport}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm whitespace-nowrap"
                  title="Kurye Hesap Kapama Raporu"
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden sm:inline">Hesap</span>
                  <span className="sm:hidden">Rapor</span>
                </button>
                <button
                  onClick={() => setShowCreateCourierModal(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm whitespace-nowrap"
                  title="Yeni Kurye Ekle"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Ekle</span>
                </button>
              </div>
            </div>
            <p className="text-3xl font-bold text-purple-600">{stats.totalCouriers}</p>
            <p className="text-sm text-gray-600 mt-2">Aktif kurye sayısı</p>

            <div className="mt-4 border-t pt-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Otomatik Meşgul Ayarı</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={autoBusyAfterOrders}
                  onChange={(event) => setAutoBusyAfterOrders(parseInt(event.target.value, 10) || 1)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm"
                  aria-label="Meşgule düşme sipariş sayısı"
                />
                <span className="text-xs text-gray-500">sipariş sonrası meşgul</span>
                <button
                  onClick={handleSaveSystemSettings}
                  disabled={settingsSaving}
                  className="ml-auto px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {settingsSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
              {systemSettings && systemSettings.courierAutoBusyAfterOrders !== autoBusyAfterOrders && (
                <p className="text-xs text-amber-600 mt-2">Değişiklikleri kaydedin.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <MapPin className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Teslim Oranı</h3>
            </div>
            <p className="text-3xl font-bold text-red-600">
              {stats.totalOrders > 0 
                ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)
                : 0}%
            </p>
            <p className="text-sm text-gray-600 mt-2">Başarılı teslimat oranı</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Son Kayıt Olan Kullanıcılar
            </h3>
            {recentUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Henüz kullanıcı kaydı yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'RESTAURANT' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'COURIER' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {user.role === 'RESTAURANT' ? 'Restoran' : user.role === 'COURIER' ? 'Kurye' : 'Admin'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-green-600" />
              Son Siparişler
            </h3>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Henüz sipariş yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-sm text-gray-600">{order.restaurant.name}</p>
                      <p className="text-xs text-gray-500">
                        Ödeme: {order.paymentMethod === 'CARD' ? 'Kredi Kartı' : order.paymentMethod === 'CASH' ? 'Nakit' : 'Belirtilmedi'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₺{order.orderAmount}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Info */}
        <div className="mt-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Sistem Durumu</h3>
              <p className="text-purple-100">Tüm servisler normal çalışıyor</p>
            </div>
            <Activity className="w-12 h-12 text-purple-200" />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-purple-100 text-sm">Backend</p>
              <p className="text-2xl font-bold">Online</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-purple-100 text-sm">Database</p>
              <p className="text-2xl font-bold">Online</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-purple-100 text-sm">WebSocket</p>
              <p className="text-2xl font-bold">Online</p>
            </div>
          </div>
        </div>
      </main>

      {/* Create Courier Modal */}
      {showCreateCourierModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Yeni Kurye Oluştur</h3>
              <button
                onClick={() => {
                  setShowCreateCourierModal(false);
                  setCreateError(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Kapat"
                aria-label="Kapat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCourier} className="p-6 space-y-4">
              {createError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  required
                  value={courierForm.name}
                  onChange={(e) => setCourierForm({ ...courierForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Ahmet Yılmaz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  required
                  value={courierForm.email}
                  onChange={(e) => setCourierForm({ ...courierForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="kurye@ornek.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre
                </label>
                <input
                  type="password"
                  required
                  value={courierForm.password}
                  onChange={(e) => setCourierForm({ ...courierForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Güçlü bir şifre"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Bu şifre ile kurye giriş yapacak
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  required
                  value={courierForm.phone}
                  onChange={(e) => setCourierForm({ ...courierForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="0555 123 4567"
                />
              </div>

              <div>
                <label htmlFor="courierVehicleType" className="block text-sm font-medium text-gray-700 mb-1">
                  Araç Tipi
                </label>
                <select
                  id="courierVehicleType"
                  title="Araç Tipi"
                  required
                  value={courierForm.vehicleType}
                  onChange={(e) => setCourierForm({ ...courierForm, vehicleType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="">Seçiniz</option>
                  <option value="Bisiklet">Bisiklet</option>
                  <option value="Motosiklet">Motosiklet</option>
                  <option value="Araba">Araba</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sipariş Başına Ödeme (TL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={courierForm.paymentPerOrder}
                  onChange={(e) => setCourierForm({ ...courierForm, paymentPerOrder: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="25.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kurye her teslimat için bu tutarı kazanacak
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateCourierModal(false);
                    setCreateError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Courier List Modal */}
      {showCourierListModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bike className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">Tüm Kuryeler</h3>
                <span className="px-2 py-1 bg-purple-100 text-purple-600 text-sm font-medium rounded-full">
                  {couriers.length}
                </span>
              </div>
              <button
                onClick={() => setShowCourierListModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Kapat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {couriers.length === 0 ? (
                <div className="text-center py-12">
                  <Bike className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Henüz kurye kaydı yok</p>
                  <button
                    onClick={() => {
                      setShowCourierListModal(false);
                      setShowCreateCourierModal(true);
                    }}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    İlk Kuryeyi Ekle
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {couriers.map((courier) => (
                    <div
                      key={courier.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <Bike className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{courier.user.name}</h4>
                          <p className="text-sm text-gray-600">{courier.user.email}</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs text-gray-500">📱 {courier.user.phone}</span>
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {courier.vehicleType}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                              💰 {courier.paymentPerOrder.toFixed(2)} TL/sipariş
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              courier.available 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {courier.available ? 'Müsait' : 'Meşgul'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-2 text-xs">
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                              Günlük meşgul: {courier.stats?.busyToggles.daily ?? 0}
                            </span>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                              Haftalık meşgul: {courier.stats?.busyToggles.weekly ?? 0}
                            </span>
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                              Aylık meşgul: {courier.stats?.busyToggles.monthly ?? 0}
                            </span>
                          </div>
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-1">Son 7 gün meşgule alma</p>
                            {(() => {
                              const chartData = courier.stats?.busyTogglesLast7Days ?? [];
                              const maxValue = Math.max(...chartData.map((item) => item.count), 1);

                              return (
                                <>
                                  <div className="flex items-end gap-1 h-16">
                                    {chartData.map((day) => {
                                const heightPercent = (day.count / maxValue) * 100;

                                const barHeight = Math.max(heightPercent, day.count > 0 ? 12 : 4);
                                const barStyle = { height: `${barHeight}%` };
                                return (
                                  <div 
                                    key={day.date} 
                                    className="flex-1 flex flex-col items-center"
                                  >
                                    <span className="text-[10px] text-gray-500 leading-none mb-1 min-h-[10px]">
                                      {day.count > 0 ? day.count : ''}
                                    </span>
                                    <div
                                      className="w-full bg-purple-500/80 rounded-t"
                                      {...{ style: barStyle }}
                                      title={`${new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: '2-digit' })}: ${day.count} kez meşgule alındı`}
                                    />
                                  </div>
                                );
                              })}
                                  </div>
                                  <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                                    {chartData.map((day) => (
                                      <span key={`label-${day.date}`}>
                                        {new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'short' }).slice(0, 2)}
                                      </span>
                                    ))}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenCourierEdit(courier)}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          title="Kuryeyi Düzenle"
                        >
                          <span>Düzenle</span>
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenCourierPerformance(courier);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title="Performans Raporu"
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span>Rapor</span>
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteCourier(courier.user.id, courier.user.name);
                          }}
                          disabled={deleteLoading === courier.user.id}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Kuryeyi Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{deleteLoading === courier.user.id ? 'Siliniyor...' : 'Sil'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                onClick={() => setShowCourierListModal(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Courier Performance Modal */}
      {showCourierPerformanceModal && selectedCourier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Kurye Performans Raporu</h3>
                <p className="text-sm text-gray-600">{selectedCourier.user.name} • {selectedCourier.user.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowCourierPerformanceModal(false);
                  setCourierPerformance(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Kapat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-gray-600">Gun Araligi:</label>
                <select
                  value={performanceDays}
                  onChange={async (event) => {
                    const nextDays = parseInt(event.target.value, 10);
                    setPerformanceDays(nextDays);
                    if (selectedCourier) {
                      await handleOpenCourierPerformance(selectedCourier, nextDays);
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  aria-label="Gün aralığı seçin"
                  title="Performans raporu için gün aralığı"
                >
                  <option value={7}>Son 7 gun</option>
                  <option value={14}>Son 14 gun</option>
                  <option value={30}>Son 30 gun</option>
                </select>
              </div>

              {performanceLoading ? (
                <div className="py-10 text-center text-gray-500">Rapor yukleniyor...</div>
              ) : courierPerformance ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-xs text-blue-700">Ortalama Teslim Suresi</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {courierPerformance.summary.averageDeliveryMinutes.toFixed(1)} dk
                      </p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <p className="text-xs text-indigo-700">Medyan Teslim Suresi</p>
                      <p className="text-2xl font-bold text-indigo-900">
                        {courierPerformance.summary.medianDeliveryMinutes.toFixed(1)} dk
                      </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-xs text-amber-700">Iptal Orani</p>
                      <p className="text-2xl font-bold text-amber-900">
                        {courierPerformance.summary.cancelRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        {courierPerformance.summary.cancelledCount} / {courierPerformance.summary.totalAssigned} siparis
                      </p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-xs text-emerald-700">Toplam Gelir (Son {performanceDays} gun)</p>
                      <p className="text-2xl font-bold text-emerald-900">
                        ₺{courierPerformance.summary.totalEarnings.toFixed(2)}
                      </p>
                      <p className="text-xs text-emerald-700 mt-1">
                        {courierPerformance.summary.deliveredCount} teslimat
                      </p>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Gunluk Gelir</div>
                    <div className="divide-y">
                      {courierPerformance.dailyEarnings.map((day) => (
                        <div key={day.date} className="flex items-center justify-between px-4 py-2 text-sm">
                          <span className="text-gray-600">
                            {new Date(day.date).toLocaleDateString('tr-TR')}
                          </span>
                          <span className="text-gray-700">{day.deliveries} teslimat</span>
                          <span className="font-semibold text-gray-900">₺{day.earnings.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Saatlik Dagilim</div>
                    <div className="p-4">
                      <div className="grid grid-cols-6 gap-2 text-xs">
                        {courierPerformance.hourlyDistribution.map((hour) => (
                          <div key={hour.hour} className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
                            <div className="text-gray-500">{hour.hour.toString().padStart(2, '0')}:00</div>
                            <div className="font-semibold text-blue-700">{hour.deliveries}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Hafta Gunu Dagilimi</div>
                    <div className="divide-y">
                      {courierPerformance.weekdayDistribution.map((day) => (
                        <div key={day.weekday} className="flex items-center justify-between px-4 py-2 text-sm">
                          <span className="text-gray-600">{weekdayLabels[day.weekday]}</span>
                          <span className="text-emerald-700">{day.delivered} teslim</span>
                          <span className="text-rose-700">{day.cancelled} iptal</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Restoran Bazli Performans</div>
                    <div className="divide-y">
                      {courierPerformance.restaurantStats.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">Veri yok</div>
                      ) : (
                        courierPerformance.restaurantStats.map((restaurant) => (
                          <div key={restaurant.restaurantName} className="flex items-center justify-between px-4 py-2 text-sm">
                            <span className="text-gray-700">{restaurant.restaurantName}</span>
                            <span className="text-gray-600">{restaurant.deliveredCount} teslim</span>
                            <span className="text-gray-900 font-semibold">
                              {restaurant.averageMinutes.toFixed(1)} dk
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">Iptal Nedenleri</div>
                    <div className="divide-y">
                      {courierPerformance.cancelReasons.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">Iptal bulunamadi</div>
                      ) : (
                        courierPerformance.cancelReasons.map((reason) => (
                          <div key={reason.reason} className="flex items-center justify-between px-4 py-2 text-sm">
                            <span className="text-gray-700">{reason.reason}</span>
                            <span className="font-semibold text-gray-900">{reason.count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center text-gray-500">Rapor bulunamadi.</div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                onClick={() => {
                  setShowCourierPerformanceModal(false);
                  setCourierPerformance(null);
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Courier Payment Edit Modal */}
      {showCourierEditModal && selectedCourier && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Kurye Ödeme Ayarı</h3>
              <button
                onClick={() => {
                  setShowCourierEditModal(false);
                  setSelectedCourier(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Kapat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-700 font-medium">{selectedCourier.user.name}</p>
                <p className="text-xs text-gray-500">{selectedCourier.user.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sipariş Başına Ödeme (TL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPaymentPerOrder}
                  onChange={(event) => setEditPaymentPerOrder(parseFloat(event.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="25.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kurye her teslimat için bu tutarı kazanacak
                </p>
              </div>

              <div>
                <label htmlFor="courierVehicleType" className="block text-sm font-medium text-gray-700 mb-1">
                  Araç Tipi
                </label>
                <select
                  id="courierVehicleType"
                  value={editVehicleType}
                  onChange={(event) => setEditVehicleType(event.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="">Seçiniz</option>
                  <option value="Bisiklet">Bisiklet</option>
                  <option value="Motosiklet">Motosiklet</option>
                  <option value="Araba">Araba</option>
                </select>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                  type="checkbox"
                  id="courierAvailable"
                  checked={editIsAvailable}
                  onChange={(event) => setEditIsAvailable(event.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="courierAvailable" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                  {editIsAvailable ? '✅ Müsait' : '❌ Meşgul'}
                </label>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex space-x-3">
              <button
                onClick={() => {
                  setShowCourierEditModal(false);
                  setSelectedCourier(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSaveCourierPayment}
                disabled={editSaving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Restaurant Modal */}
      {showCreateRestaurantModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Yeni Restoran Oluştur</h3>
              <button
                onClick={() => {
                  setShowCreateRestaurantModal(false);
                  setCreateError(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Kapat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateRestaurant} className="p-6 space-y-4">
              {createError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yetkili Adı Soyadı
                </label>
                <input
                  type="text"
                  required
                  value={restaurantForm.name}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="Ahmet Yılmaz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  required
                  value={restaurantForm.email}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="restoran@ornek.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre
                </label>
                <input
                  type="password"
                  required
                  value={restaurantForm.password}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="Güçlü bir şifre"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Bu şifre ile restoran giriş yapacak
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yetkili Telefon
                </label>
                <input
                  type="tel"
                  required
                  value={restaurantForm.phone}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="0555 123 4567"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Restoran Bilgileri</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Restoran Adı
                    </label>
                    <input
                      type="text"
                      required
                      value={restaurantForm.restaurantName}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, restaurantName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                      placeholder="Lezzet Durağı"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Restoran Adresi
                    </label>
                    <textarea
                      required
                      value={restaurantForm.address}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                      placeholder="Tam adres"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Restoran Telefon
                    </label>
                    <input
                      type="tel"
                      required
                      value={restaurantForm.restaurantPhone}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, restaurantPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                      placeholder="0555 987 6543"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Komisyon (Sipariş Başına TL)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={restaurantForm.commissionPerOrder}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, commissionPerOrder: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                      placeholder="150.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Her sipariş için alınacak sabit komisyon tutarı
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateRestaurantModal(false);
                    setCreateError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restaurant List Modal */}
      {showRestaurantListModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Store className="w-6 h-6 text-indigo-600" />
                <h3 className="text-xl font-bold text-gray-900">Tüm Restoranlar</h3>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-600 text-sm font-medium rounded-full">
                  {restaurants.length}
                </span>
                <div className="ml-4 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-xs text-green-600 font-medium">Bugün Toplam Gelir:</span>
                  <span className="ml-2 text-sm font-bold text-green-700">
                    ₺{todayTotalRevenue.toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowRestaurantListModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Kapat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {restaurants.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Henüz restoran kaydı yok</p>
                  <button
                    onClick={() => {
                      setShowRestaurantListModal(false);
                      setShowCreateRestaurantModal(true);
                    }}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    İlk Restoranı Ekle
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {restaurants.map((restaurant) => (
                    <div
                      key={restaurant.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Store className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{restaurant.name}</h4>
                          <p className="text-sm text-gray-600">{restaurant.user.email}</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs text-gray-500">👤 {restaurant.user.name}</span>
                            <span className="text-xs text-gray-500">📱 {restaurant.phone}</span>
                            <span className="text-xs text-gray-500">📍 {restaurant.address}</span>
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                              Komisyon: ₺{restaurant.commissionPerOrder.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRestaurantClick(restaurant)}
                          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          title="Restoran Detayları"
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>Detay</span>
                        </button>
                        <button
                          onClick={() => handleDeleteRestaurant(restaurant.id, restaurant.name)}
                          disabled={deleteLoading === restaurant.id}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Restoranı Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{deleteLoading === restaurant.id ? 'Siliniyor...' : 'Sil'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                onClick={() => setShowRestaurantListModal(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Detail Modal */}
      {showRestaurantDetailModal && selectedRestaurant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Store className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedRestaurant.name}</h3>
                  <p className="text-sm text-gray-600">{selectedRestaurant.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRestaurantDetailModal(false);
                  setSelectedRestaurant(null);
                  setFinancialReport(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Kapat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sol Panel - Restoran Bilgileri ve Komisyon */}
                <div className="space-y-6">
                  {/* Restoran Bilgileri */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Store className="w-5 h-5 mr-2 text-indigo-600" />
                      Restoran Bilgileri
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Yetkili:</span>
                        <span className="font-medium">{selectedRestaurant.user.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Telefon:</span>
                        <span className="font-medium">{selectedRestaurant.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Adres:</span>
                        <span className="font-medium text-right">{selectedRestaurant.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Komisyon Tutar Yönetimi */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-indigo-600" />
                      Komisyon (Siparis Basina TL)
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Mevcut Tutar:</span>
                        <span className="text-2xl font-bold text-indigo-600">
                          ₺{selectedRestaurant.commissionPerOrder.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newCommission}
                          onChange={(e) => setNewCommission(parseFloat(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                          placeholder="Yeni tutar"
                        />
                        <span className="text-gray-600">₺</span>
                        <button
                          onClick={handleCommissionUpdate}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                        >
                          Güncelle
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Her sipariş için alınacak sabit komisyon tutarini buradan degistirebilirsiniz
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sağ Panel - Finansal Rapor */}
                <div className="space-y-4">
                  {/* Periyot Seçimi */}
                  <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                    {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => handlePeriodChange(period)}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                          reportPeriod === period
                            ? 'bg-white text-indigo-600 shadow-sm font-medium'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {period === 'daily' ? 'Günlük' : period === 'weekly' ? 'Haftalık' : 'Aylık'}
                      </button>
                    ))}
                  </div>

                  {/* Finansal Özet */}
                  {financialReport && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">Toplam Sipariş</span>
                            <Package className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {financialReport.summary.totalOrders}
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">Toplam Gelir</span>
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            ₺{financialReport.summary.totalRevenue.toFixed(2)}
                          </div>
                        </div>

                        <div className="bg-red-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">Komisyon</span>
                            <DollarSign className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="text-2xl font-bold text-red-600">
                            ₺{financialReport.summary.totalCommission.toFixed(2)}
                          </div>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">Restorana Ödenecek</span>
                            <Store className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="text-2xl font-bold text-purple-600">
                            ₺{financialReport.summary.netIncome.toFixed(2)}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Toplam Gelir - Komisyon
                          </p>
                        </div>
                      </div>

                      <div className="bg-amber-50 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-3">Ödeme Yöntemi Dağılımı</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded p-3">
                            <p className="text-xs text-gray-600">Nakit Tutarı</p>
                            <p className="text-lg font-bold text-amber-700">
                              ₺{financialReport.orders
                                .filter((order) => order.paymentMethod === 'CASH')
                                .reduce((sum, order) => sum + order.orderAmount, 0)
                                .toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {financialReport.orders.filter((order) => order.paymentMethod === 'CASH').length} sipariş
                            </p>
                          </div>
                          <div className="bg-white rounded p-3">
                            <p className="text-xs text-gray-600">Kredi Kartı Tutarı</p>
                            <p className="text-lg font-bold text-amber-700">
                              ₺{financialReport.orders
                                .filter((order) => order.paymentMethod === 'CARD')
                                .reduce((sum, order) => sum + order.orderAmount, 0)
                                .toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {financialReport.orders.filter((order) => order.paymentMethod === 'CARD').length} sipariş
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Net Kazanç */}
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-4 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm opacity-90">Net Kazanç</div>
                            <div className="text-3xl font-bold mt-1">
                              ₺{financialReport.summary.netIncome.toFixed(2)}
                            </div>
                          </div>
                          <Activity className="w-8 h-8 opacity-75" />
                        </div>
                      </div>

                      {/* Günlük İstatistikler */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-3">Günlük Detay</h5>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {financialReport.dailyStats.map((stat: DailyStat) => (
                            <div key={stat.date} className="bg-white rounded p-3 text-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-900">
                                  {new Date(stat.date).toLocaleDateString('tr-TR')}
                                </span>
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                  {stat.orderCount} sipariş
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-600">Gelir: </span>
                                  <span className="font-medium">₺{stat.revenue.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Net: </span>
                                  <span className="font-medium text-green-600">₺{stat.netIncome.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {!financialReport && (
                    <div className="text-center py-12">
                      <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Finansal rapor yükleniyor...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                onClick={() => {
                  setShowRestaurantDetailModal(false);
                  setSelectedRestaurant(null);
                  setFinancialReport(null);
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kurye Hesap Kapama Raporu Modal */}
      {showCourierSettlementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Kurye Hesap Kapama Raporu</h2>
              <button
                onClick={() => setShowCourierSettlementModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6 overflow-auto space-y-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-end">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Başlangıç</label>
                  <input
                    type="date"
                    className="input"
                    value={settlementStartDate}
                    onChange={(e) => setSettlementStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Bitiş</label>
                  <input
                    type="date"
                    className="input"
                    value={settlementEndDate}
                    onChange={(e) => setSettlementEndDate(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleFilterCourierSettlementReport}
                  className="btn btn-primary"
                  disabled={courierSettlementLoading}
                >
                  {courierSettlementLoading ? 'Yükleniyor...' : 'Filtrele'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-700">Kapanan Kayıt</p>
                  <p className="text-xl font-semibold text-blue-900">
                    {courierSettlementReport?.summary.totalRecords || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-xs text-green-700">Toplam Kapatılan Tutar</p>
                  <p className="text-xl font-semibold text-green-900">
                    ₺{(courierSettlementReport?.summary.totalClosedAmount || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-3 py-2">Tarih</th>
                      <th className="px-3 py-2">Kurye</th>
                      <th className="px-3 py-2">Restoran</th>
                      <th className="px-3 py-2">Paket</th>
                      <th className="px-3 py-2">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(courierSettlementReport?.settlements || []).map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">{new Date(item.date).toLocaleString('tr-TR')}</td>
                        <td className="px-3 py-2">{item.courier?.name || 'Kurye'}</td>
                        <td className="px-3 py-2">{item.restaurant?.name || '-'}</td>
                        <td className="px-3 py-2">{item.packageCount ?? '-'}</td>
                        <td className="px-3 py-2 font-semibold">₺{item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                    {!courierSettlementLoading && !courierSettlementReport?.settlements?.length && (
                      <tr>
                        <td className="px-3 py-6 text-center text-gray-500" colSpan={5}>
                          Seçilen aralıkta kapatılmış hesap bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kurye Konum Haritası Modal */}
      {showCourierMapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <MapPin className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold text-gray-900">Kurye Konumları</h2>
              </div>
              <button
                onClick={() => setShowCourierMapModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Kapat"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">{couriers.length}</span> kurye sistemde kayıtlı
                    {courierLocations.length > 0 && (
                      <> • <span className="font-semibold text-green-700">{courierLocations.length}</span> kurye aktif konum paylaşıyor</>
                    )}
                  </p>
                </div>
              </div>

              <div className="h-[500px] rounded-xl overflow-hidden border border-gray-200">
                <MapComponent
                  courierLocations={courierLocations}
                  center={
                    courierLocations.length > 0
                      ? [
                          courierLocations[0].latitude,
                          courierLocations[0].longitude
                        ]
                      : [35.1264, 33.4299] // Kıbrıs varsayılan
                  }
                  zoom={11}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {couriers.map(courier => {
                  const hasActiveLocation = courierLocations.some(loc => loc.courierId === courier.userId);
                  return (
                    <div
                      key={courier.id}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 text-sm">{courier.user.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          courier.available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {courier.available ? 'Müsait' : 'Meşgul'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>Email: {courier.user.email}</p>
                        <p>Araç: {courier.vehicleType || 'Belirtilmemiş'}</p>
                        <p>Telefon: {courier.user.phone || 'Belirtilmemiş'}</p>
                        {hasActiveLocation ? (
                          <p className="text-green-600 font-medium flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>Konum paylaşıyor (Canlı)</span>
                          </p>
                        ) : (
                          <p className="text-gray-400">Konum bilgisi yok</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                onClick={() => setShowCourierMapModal(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
