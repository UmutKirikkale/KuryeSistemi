import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useLocationStore } from '../store/locationStore';
import { wsService } from '../services/websocket';
import { locationService } from '../services/locationService';
import { financialService } from '../services/financialService';
import {
  LogOut,
  Package,
  DollarSign,
  Navigation,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import OrderList from '../components/OrderList';
import CourierLocationTracker from '../components/CourierLocationTracker';

export default function CourierDashboard() {
  const { user, logout } = useAuthStore();
  const { orders, fetchOrders } = useOrderStore();
  const { setIsTracking } = useLocationStore();
  const [earnings, setEarnings] = useState<any>(null);
  const [settlementReport, setSettlementReport] = useState<any>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [closingSettlement, setClosingSettlement] = useState(false);
  const [orderPeriod, setOrderPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderPlatformFilter, setOrderPlatformFilter] = useState('ALL');
  const [settlementDate, setSettlementDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const periodRef = useRef<'daily' | 'weekly' | 'monthly'>('daily');
  const [isAvailable, setIsAvailable] = useState(
    user?.courierProfile?.isAvailable || false
  );

  useEffect(() => {
    // Siparişleri yükle
    fetchOrders({ limit: 100, period: periodRef.current });

    // Kazançları yükle
    loadEarnings();
    loadSettlementReport(settlementDate);

    // WebSocket dinleyicilerini kur
    wsService.onOrderStatusUpdate(() => {
      fetchOrders({ limit: 100, period: periodRef.current });
    });

    wsService.onNewOrder(() => {
      // Yeni sipariş bildirimi
      fetchOrders({ limit: 100, period: periodRef.current });
    });

    return () => {
      // Cleanup
    };
  }, []);

  useEffect(() => {
    loadSettlementReport(settlementDate);
  }, [settlementDate]);

  useEffect(() => {
    periodRef.current = orderPeriod;
    fetchOrders({ limit: 100, period: orderPeriod });
  }, [fetchOrders, orderPeriod]);

  const loadEarnings = async () => {
    try {
      const response = await financialService.getCourierEarnings();
      setEarnings(response);
    } catch (error) {
      console.error('Failed to load earnings:', error);
    }
  };

  const loadSettlementReport = async (date: string) => {
    try {
      setSettlementLoading(true);
      const response = await financialService.getCourierSettlement(date);
      setSettlementReport(response.report);
    } catch (error) {
      console.error('Failed to load settlement report:', error);
    } finally {
      setSettlementLoading(false);
    }
  };

  const handleCloseSettlement = async () => {
    try {
      setClosingSettlement(true);
      const response = await financialService.closeCourierSettlement(settlementDate);
      setSettlementReport(response.report);
      alert(response.message || 'Günlük hesap kapama tamamlandı');
    } catch (error) {
      console.error('Failed to close settlement:', error);
      alert('Günlük hesap kapama başarısız oldu');
    } finally {
      setClosingSettlement(false);
    }
  };

  const handleCloseRestaurantSettlement = async (restaurantId: string) => {
    try {
      setClosingSettlement(true);
      const response = await financialService.closeCourierSettlementForRestaurant(restaurantId, settlementDate);
      setSettlementReport(response.report);
      alert(response.message || 'Restoran hesabi kapatildi');
    } catch (error) {
      console.error('Failed to close restaurant settlement:', error);
      alert('Restoran hesap kapama başarısız oldu');
    } finally {
      setClosingSettlement(false);
    }
  };

  const handleReopenRestaurantSettlement = async (restaurantId: string) => {
    try {
      setClosingSettlement(true);
      const response = await financialService.reopenCourierSettlementForRestaurant(restaurantId, settlementDate);
      setSettlementReport(response.report);
      alert(response.message || 'Restoran hesabi yeniden acildi');
    } catch (error) {
      console.error('Failed to reopen restaurant settlement:', error);
      alert('Restoran hesap açma başarısız oldu');
    } finally {
      setClosingSettlement(false);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      const response = await locationService.toggleAvailability();
      setIsAvailable(response.isAvailable);
    } catch (error) {
      console.error('Failed to toggle availability:', error);
    }
  };

  const handleLogout = () => {
    setIsTracking(false);
    logout();
  };

  const myOrders = orders.filter(
    (order) => order.courier?.id === user?.id || ['PENDING', 'APPROVED', 'PREPARING'].includes(order.status)
  );

  const filteredMyOrders = useMemo(() => {
    const normalizedQuery = orderQuery.trim().toLowerCase();

    return myOrders.filter((order) => {
      const statusOk = orderStatusFilter === 'ALL' || order.status === orderStatusFilter;
      const platformOk = orderPlatformFilter === 'ALL' || (order.sourcePlatform || '') === orderPlatformFilter;
      if (!statusOk || !platformOk) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${order.orderNumber} ${order.customerName} ${order.deliveryAddress} ${order.sourcePlatform || ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [myOrders, orderPlatformFilter, orderQuery, orderStatusFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kurye Paneli</h1>
              <p className="text-sm text-gray-600">Hoş geldiniz, {user?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleToggleAvailability}
                className={`btn flex items-center gap-2 ${
                  isAvailable ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                {isAvailable ? (
                  <>
                    <ToggleRight className="w-5 h-5" />
                    Müsait
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5" />
                    Meşgul
                  </>
                )}
              </button>
              <button onClick={handleLogout} className="btn btn-secondary flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Teslimat</p>
                <p className="text-2xl font-bold text-gray-900">
                  {earnings?.summary.totalOrders || 0}
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
                <p className="text-sm text-gray-600">Toplam Kazanç</p>
                <p className="text-2xl font-bold text-gray-900">
                  {earnings?.summary.totalEarnings.toFixed(2) || '0.00'} ₺
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
                <p className="text-sm text-gray-600">Sipariş Başına Ücret</p>
                <p className="text-2xl font-bold text-gray-900">
                  {earnings?.summary.paymentPerOrder.toFixed(2) || '0.00'} ₺
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Navigation className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Location Tracker */}
        <div className="card mb-6">
          <CourierLocationTracker />
        </div>

        {/* Daily Settlement */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Günlük Hesap Kapama</h2>
              <p className="text-sm text-gray-600">
                Restoran bazlı teslimat adetleri ve komisyon sonrası ödenecek tutarlar
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="courierSettlementDate" className="sr-only">Hesap kapama tarihi</label>
              <input
                id="courierSettlementDate"
                type="date"
                className="input"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
              />
              <button
                onClick={handleCloseSettlement}
                disabled={closingSettlement || settlementLoading || !settlementReport?.totals?.openRestaurants}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {closingSettlement ? 'Kapatılıyor...' : 'Tüm Açık Restoranları Kapat'}
              </button>
            </div>
          </div>

          {settlementLoading ? (
            <p className="text-sm text-gray-500">Rapor yükleniyor...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-700">Toplam Restoran</p>
                  <p className="text-lg font-semibold text-blue-900">{settlementReport?.totals?.totalRestaurants || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                  <p className="text-xs text-indigo-700">Toplam Paket</p>
                  <p className="text-lg font-semibold text-indigo-900">{settlementReport?.totals?.totalPackages || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                  <p className="text-xs text-orange-700">Açık Hesap</p>
                  <p className="text-lg font-semibold text-orange-900">{settlementReport?.totals?.openRestaurants || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-xs text-green-700">Restorana Ödenecek</p>
                  <p className="text-lg font-semibold text-green-900">
                    {(settlementReport?.totals?.totalAmountToRestaurant || 0).toFixed(2)} ₺
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Restoran</th>
                      <th className="py-2 pr-4">Paket</th>
                      <th className="py-2 pr-4">Brüt</th>
                      <th className="py-2 pr-4">Komisyon</th>
                      <th className="py-2 pr-4">Kurye Ücreti</th>
                      <th className="py-2 pr-4">Ödenecek</th>
                      <th className="py-2">Durum</th>
                      <th className="py-2">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settlementReport?.rows || []).map((row: any) => (
                      <tr key={row.restaurantId} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{row.restaurantName}</td>
                        <td className="py-2 pr-4">{row.packageCount}</td>
                        <td className={`py-2 pr-4 ${row.isClosed ? 'text-gray-400 line-through' : ''}`}>{row.isClosed ? '0.00' : row.grossAmount.toFixed(2)} ₺</td>
                        <td className={`py-2 pr-4 ${row.isClosed ? 'text-gray-400 line-through' : ''}`}>{row.isClosed ? '0.00' : row.commissionAmount.toFixed(2)} ₺</td>
                        <td className={`py-2 pr-4 ${row.isClosed ? 'text-gray-400 line-through' : ''}`}>{row.isClosed ? '0.00' : row.courierFeeAmount.toFixed(2)} ₺</td>
                        <td className={`py-2 pr-4 font-semibold ${row.isClosed ? 'text-gray-400' : ''}`}>{row.isClosed ? '0.00' : row.amountToRestaurant.toFixed(2)} ₺</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${row.isClosed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {row.isClosed ? 'Kapalı' : 'Açık'}
                          </span>
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => row.isClosed ? handleReopenRestaurantSettlement(row.restaurantId) : handleCloseRestaurantSettlement(row.restaurantId)}
                            disabled={closingSettlement}
                            className={`px-2 py-1 rounded text-xs font-semibold text-white disabled:opacity-50 ${row.isClosed ? 'bg-orange-600' : 'bg-teal-600'}`}
                          >
                            {row.isClosed ? 'Yeniden Aç' : 'Bu Restoranı Kapat'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!settlementReport?.rows?.length && (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-gray-500">
                          Bu tarih için hesap kapama verisi bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Orders */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">Siparişler</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOrderPeriod('daily')}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  orderPeriod === 'daily' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Günlük
              </button>
              <button
                onClick={() => setOrderPeriod('weekly')}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  orderPeriod === 'weekly' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Haftalık
              </button>
              <button
                onClick={() => setOrderPeriod('monthly')}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  orderPeriod === 'monthly' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Aylık
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <input
              type="text"
              value={orderQuery}
              onChange={(event) => setOrderQuery(event.target.value)}
              placeholder="Sipariş no, müşteri, adres ara"
              className="input"
            />
            <select
              title="Durum filtresi"
              value={orderStatusFilter}
              onChange={(event) => setOrderStatusFilter(event.target.value)}
              className="input"
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
              title="Platform filtresi"
              value={orderPlatformFilter}
              onChange={(event) => setOrderPlatformFilter(event.target.value)}
              className="input"
            >
              <option value="ALL">Tüm Platformlar</option>
              <option value="FEEDME">Feedme</option>
              <option value="YEMEKSEPETI">Yemeksepeti</option>
            </select>
          </div>

          <OrderList orders={filteredMyOrders} role="COURIER" />
        </div>
      </div>
    </div>
  );
}
