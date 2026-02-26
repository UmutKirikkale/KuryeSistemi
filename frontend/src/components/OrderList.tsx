import { useState } from 'react';
import { useOrderStore } from '../store/orderStore';
import { Package, MapPin, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Restoran marker icon
const restaurantIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  orderAmount: number;
  courierFee: number;
  commissionAmount: number;
  customerName: string;
  sourcePlatform?: string;
  externalOrderId?: string;
  paymentMethod?: 'CASH' | 'CARD';
  courier?: {
    name: string;
  };
  restaurant?: {
    id: string;
    name: string;
    address: string;
    phone: string;
    latitude?: number;
    longitude?: number;
  };
  createdAt: string;
}

interface OrderListProps {
  orders: Order[];
  role: 'RESTAURANT' | 'COURIER';
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-amber-100 text-amber-800',
  PREPARING: 'bg-orange-100 text-orange-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  PICKED_UP: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

const statusLabels: Record<string, string> = {
  PENDING: 'Bekliyor',
  APPROVED: 'Onaylandı',
  PREPARING: 'Hazırlanıyor',
  ASSIGNED: 'Atandı',
  PICKED_UP: 'Yolda',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal'
};

const paymentMethodLabels: Record<'CASH' | 'CARD', string> = {
  CASH: 'Nakit',
  CARD: 'Kredi Kartı'
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiError;
  return apiError?.response?.data?.error || fallback;
};

export default function OrderList({ orders, role }: OrderListProps) {
  const { assignOrder, updateOrderStatus, fetchOrders } = useOrderStore();
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryPaymentMethods, setDeliveryPaymentMethods] = useState<Record<string, 'CASH' | 'CARD'>>({});

  const handleAssign = async (orderId: string) => {
    try {
      await assignOrder(orderId);
      await fetchOrders();
    } catch (error) {
      console.error('Failed to assign order:', error);
      const message = getErrorMessage(error, 'Sipariş alınamadı. Lütfen tekrar deneyin.');
      alert(message);
    }
  };

  const handleStatusUpdate = async (
    orderId: string,
    status: string,
    paymentMethod?: 'CASH' | 'CARD',
    cancelReason?: string
  ) => {
    try {
      await updateOrderStatus(orderId, status, paymentMethod, cancelReason);
      await fetchOrders();
      if (status === 'DELIVERED') {
        setDeliveryPaymentMethods((prev) => {
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      const message = getErrorMessage(error, 'Sipariş durumu güncellenemedi.');
      alert(message);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const reasonInput = window.prompt('İptal nedeni girin (min 2 karakter):');
    if (reasonInput === null) {
      return;
    }

    const reason = reasonInput.trim();
    if (reason.length < 2) {
      alert('İptal nedeni en az 2 karakter olmalıdır.');
      return;
    }

    await handleStatusUpdate(orderId, 'CANCELLED', undefined, reason);
  };

  const handleShowRestaurantLocation = (order: Order) => {
    if (order.restaurant?.latitude && order.restaurant?.longitude) {
      setSelectedOrder(order);
      setShowMapModal(true);
    } else {
      alert('⚠️ Restoran konum bilgisi bulunamadı');
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Henüz sipariş bulunmuyor</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                  {statusLabels[order.status]}
                </span>
                {order.sourcePlatform && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    {order.sourcePlatform}
                  </span>
                )}
              </div>
              {order.externalOrderId && (
                <p className="text-xs text-indigo-700">Platform Sipariş No: {order.externalOrderId}</p>
              )}
              <p className="text-sm text-gray-600">
                {new Date(order.createdAt).toLocaleString('tr-TR')}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">{order.orderAmount.toFixed(2)} ₺</p>
              <p className="text-sm text-gray-600">Komisyon: {order.commissionAmount.toFixed(2)} ₺</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Alış</p>
              <p className="text-sm">{order.pickupAddress}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Teslimat</p>
              <p className="text-sm">{order.deliveryAddress}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <div>
              <p className="text-sm text-gray-600">
                Müşteri: {order.customerName}
              </p>
              {order.paymentMethod && (
                <p className="text-sm text-gray-600">
                  Ödeme: {paymentMethodLabels[order.paymentMethod]}
                </p>
              )}
              {order.courier && (
                <p className="text-sm text-gray-600">
                  Kurye: {order.courier.name}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {role === 'COURIER' && (order.status === 'ASSIGNED' || order.status === 'PICKED_UP') && (
                <button
                  onClick={() => handleShowRestaurantLocation(order)}
                  className="btn btn-secondary btn-sm flex items-center gap-1"
                  title="Restoran Konumunu Gör"
                >
                  <MapPin className="w-4 h-4" />
                  Restoran
                </button>
              )}

              {role === 'COURIER' && order.status === 'PENDING' && (
                <button
                  onClick={() => handleAssign(order.id)}
                  className="btn btn-primary btn-sm"
                >
                  Siparişi Al
                </button>
              )}

              {role === 'COURIER' && order.status === 'ASSIGNED' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusUpdate(order.id, 'PICKED_UP')}
                    className="btn btn-primary btn-sm"
                  >
                    Teslim Aldım
                  </button>
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    İptal Et
                  </button>
                </div>
              )}

              {role === 'COURIER' && order.status === 'PICKED_UP' && (
                <div className="flex items-center gap-2">
                  <label htmlFor={`paymentMethod-${order.id}`} className="sr-only">
                    Ödeme Tipi
                  </label>
                  <select
                    id={`paymentMethod-${order.id}`}
                    value={deliveryPaymentMethods[order.id] || ''}
                    onChange={(event) => {
                      const value = event.target.value as 'CASH' | 'CARD' | '';
                      setDeliveryPaymentMethods((prev) => ({
                        ...prev,
                        [order.id]: value === '' ? prev[order.id] : value
                      }));
                    }}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Ödeme Tipi</option>
                    <option value="CASH">Nakit</option>
                    <option value="CARD">Kredi Kartı</option>
                  </select>
                  <button
                    onClick={() => handleStatusUpdate(order.id, 'DELIVERED', deliveryPaymentMethods[order.id])}
                    className="btn btn-primary btn-sm"
                    disabled={!deliveryPaymentMethods[order.id]}
                  >
                    Teslim Ettim
                  </button>
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    İptal Et
                  </button>
                </div>
              )}

              {role === 'RESTAURANT' && order.status === 'PENDING' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusUpdate(order.id, 'APPROVED')}
                    className="btn btn-primary btn-sm"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    İptal Et
                  </button>
                </div>
              )}

              {role === 'RESTAURANT' && order.status === 'APPROVED' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusUpdate(order.id, 'PREPARING')}
                    className="btn btn-primary btn-sm"
                  >
                    Hazırlanıyor
                  </button>
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    İptal Et
                  </button>
                </div>
              )}

              {role === 'RESTAURANT' && ['PREPARING', 'ASSIGNED'].includes(order.status) && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusUpdate(order.id, 'PICKED_UP')}
                    className="btn btn-primary btn-sm"
                  >
                    Yola Çıktı
                  </button>
                  <button
                    onClick={() => handleCancelOrder(order.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    İptal Et
                  </button>
                </div>
              )}

              {role === 'RESTAURANT' && order.status === 'PICKED_UP' && (
                <div className="flex items-center gap-2">
                  <label htmlFor={`paymentMethod-rest-${order.id}`} className="sr-only">
                    Ödeme Tipi
                  </label>
                  <select
                    id={`paymentMethod-rest-${order.id}`}
                    value={deliveryPaymentMethods[order.id] || ''}
                    onChange={(event) => {
                      const value = event.target.value as 'CASH' | 'CARD' | '';
                      setDeliveryPaymentMethods((prev) => ({
                        ...prev,
                        [order.id]: value === '' ? prev[order.id] : value
                      }));
                    }}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Ödeme Tipi</option>
                    <option value="CASH">Nakit</option>
                    <option value="CARD">Kredi Kartı</option>
                  </select>
                  <button
                    onClick={() =>
                      handleStatusUpdate(
                        order.id,
                        'DELIVERED',
                        deliveryPaymentMethods[order.id]
                      )
                    }
                    className="btn btn-primary btn-sm"
                    disabled={!deliveryPaymentMethods[order.id]}
                  >
                    Teslim Edildi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Restoran Konum Haritası Modal */}
      {showMapModal && selectedOrder && selectedOrder.restaurant?.latitude && selectedOrder.restaurant?.longitude && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Restoran Konumu</h3>
                  <p className="text-sm text-gray-600">{selectedOrder.restaurant.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMapModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Kapat"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <p className="text-blue-900">
                    <span className="font-semibold">Restoran:</span> {selectedOrder.restaurant.name}
                  </p>
                  <p className="text-blue-900">
                    <span className="font-semibold">Adres:</span> {selectedOrder.restaurant.address}
                  </p>
                  <p className="text-blue-900">
                    <span className="font-semibold">Telefon:</span> {selectedOrder.restaurant.phone}
                  </p>
                  <p className="text-blue-700 text-xs">
                    📍 {selectedOrder.restaurant.latitude.toFixed(6)}, {selectedOrder.restaurant.longitude.toFixed(6)}
                  </p>
                </div>
              </div>

              <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200">
                <MapContainer
                  center={[selectedOrder.restaurant.latitude, selectedOrder.restaurant.longitude]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  className="z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={[selectedOrder.restaurant.latitude, selectedOrder.restaurant.longitude]}
                    icon={restaurantIcon}
                  >
                    <Popup>
                      <div className="text-sm">
                        <h4 className="font-semibold text-gray-900">{selectedOrder.restaurant.name}</h4>
                        <p className="text-gray-600 text-xs mt-1">{selectedOrder.restaurant.address}</p>
                        <p className="text-gray-600 text-xs mt-1">📞 {selectedOrder.restaurant.phone}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>

              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  💡 <strong>İpucu:</strong> Haritayı zoom yaparak detaylı görüntüleyebilir, marker'a tıklayarak restoran bilgilerini görebilirsiniz.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <button
                onClick={() => {
                  setShowMapModal(false);
                  setSelectedOrder(null);
                }}
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
