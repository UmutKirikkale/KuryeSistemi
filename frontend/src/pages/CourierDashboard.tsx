import { useEffect, useState } from 'react';
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
  const [settlementDate, setSettlementDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [isAvailable, setIsAvailable] = useState(
    user?.courierProfile?.isAvailable || false
  );

  useEffect(() => {
    // Siparişleri yükle
    fetchOrders();

    // Kazançları yükle
    loadEarnings();
    loadSettlementReport(settlementDate);

    // WebSocket dinleyicilerini kur
    wsService.onOrderStatusUpdate(() => {
      fetchOrders();
    });

    wsService.onNewOrder(() => {
      // Yeni sipariş bildirimi
      fetchOrders();
    });

    return () => {
      // Cleanup
    };
  }, []);

  useEffect(() => {
    loadSettlementReport(settlementDate);
  }, [settlementDate]);

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
    (order) => order.courier?.id === user?.id || order.status === 'PENDING'
  );

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
              <input
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
                {closingSettlement ? 'Kapatılıyor...' : 'Gün Sonu Hesap Kapat'}
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
                    </tr>
                  </thead>
                  <tbody>
                    {(settlementReport?.rows || []).map((row: any) => (
                      <tr key={row.restaurantId} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{row.restaurantName}</td>
                        <td className="py-2 pr-4">{row.packageCount}</td>
                        <td className="py-2 pr-4">{row.grossAmount.toFixed(2)} ₺</td>
                        <td className="py-2 pr-4">{row.commissionAmount.toFixed(2)} ₺</td>
                        <td className="py-2 pr-4">{row.courierFeeAmount.toFixed(2)} ₺</td>
                        <td className="py-2 pr-4 font-semibold">{row.amountToRestaurant.toFixed(2)} ₺</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${row.isClosed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {row.isClosed ? 'Kapalı' : 'Açık'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!settlementReport?.rows?.length && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-gray-500">
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
          <h2 className="text-xl font-semibold mb-6">Siparişler</h2>
          <OrderList orders={myOrders} role="COURIER" />
        </div>
      </div>
    </div>
  );
}
