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
  const [isAvailable, setIsAvailable] = useState(
    user?.courierProfile?.isAvailable || false
  );

  useEffect(() => {
    // Siparişleri yükle
    fetchOrders();

    // Kazançları yükle
    loadEarnings();

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

  const loadEarnings = async () => {
    try {
      const response = await financialService.getCourierEarnings();
      setEarnings(response);
    } catch (error) {
      console.error('Failed to load earnings:', error);
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

        {/* Orders */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6">Siparişler</h2>
          <OrderList orders={myOrders} role="COURIER" />
        </div>
      </div>
    </div>
  );
}
