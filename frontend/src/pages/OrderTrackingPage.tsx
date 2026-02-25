import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { marketplaceService, MarketplaceOrderStatusResponse } from '../services/marketplaceService';

interface OrderRating {
  id: string;
  speedScore: number;
  tasteScore: number;
  priceScore: number;
  createdAt: string;
}

const OrderTrackingPage = () => {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState('');
  const [orderStatus, setOrderStatus] = useState<MarketplaceOrderStatusResponse['order'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rating, setRating] = useState<OrderRating | null>(null);
  const [ratingForm, setRatingForm] = useState({
    speedScore: 10,
    tasteScore: 10,
    priceScore: 10
  });
  const [ratingError, setRatingError] = useState('');
  const [ratingSuccess, setRatingSuccess] = useState('');

  // URL'den order number'ı al
  useEffect(() => {
    const orderNumberFromUrl = searchParams.get('orderNumber');
    if (orderNumberFromUrl) {
      setOrderNumber(orderNumberFromUrl);
      // Otomatik olarak arama yap
      performSearch(orderNumberFromUrl);
    }
  }, [searchParams]);

  const performSearch = async (orderNum: string) => {
    if (!orderNum.trim()) {
      setError('Lütfen sipariş numarası girin');
      return;
    }

    setLoading(true);
    setError('');
    setOrderStatus(null);

    try {
      const response = await marketplaceService.getOrderStatus(orderNum.trim());
      setOrderStatus(response.order);
      const customerToken = localStorage.getItem('customerToken');
      if (customerToken) {
        const ratingResponse = await marketplaceService.getOrderRating(orderNum.trim());
        setRating(ratingResponse.rating);
      } else {
        setRating(null);
      }
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'response' in err 
        ? ((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Sipariş bulunamadı')
        : 'Sipariş bulunamadı';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    performSearch(orderNumber);
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-amber-100 text-amber-800';
      case 'PREPARING':
        return 'bg-orange-100 text-orange-800';
      case 'PICKED_UP':
        return 'bg-purple-100 text-purple-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return 'Bekliyor';
      case 'ASSIGNED':
        return 'Kuryeye Atandı';
      case 'APPROVED':
        return 'Onaylandı';
      case 'PREPARING':
        return 'Hazırlanıyor';
      case 'PICKED_UP':
        return 'Yola Çıktı';
      case 'DELIVERED':
        return 'Teslim Edildi';
      case 'CANCELLED':
        return 'İptal Edildi';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Sipariş Takibi</h1>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sipariş Numarası
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Örn: MKT-1234567890-ABC123"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? 'Aranıyor...' : 'Sorgula'}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-red-600 text-sm">{error}</p>
            )}
          </div>

          {orderStatus && (
            <div className="border-t pt-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Sipariş: {orderStatus.orderNumber}
                  </h2>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadgeClass(
                      orderStatus.status
                    )}`}
                  >
                    {getStatusLabel(orderStatus.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Sipariş Tarihi: {new Date(orderStatus.createdAt).toLocaleString('tr-TR')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Müşteri Bilgileri</h3>
                  <p className="text-sm text-gray-600">
                    <strong>Ad:</strong> {orderStatus.customerName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Telefon:</strong> {orderStatus.customerPhone}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Restoran</h3>
                  <p className="text-sm text-gray-600">
                    <strong>İsim:</strong> {orderStatus.pickup.restaurant}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Adres:</strong> {orderStatus.pickup.address}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Teslimat Adresi</h3>
                  <p className="text-sm text-gray-600">{orderStatus.delivery.address}</p>
                </div>

                {orderStatus.courier && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-700 mb-2">Kurye Bilgileri</h3>
                    <p className="text-sm text-blue-600">
                      <strong>Ad:</strong> {orderStatus.courier.name}
                    </p>
                    <p className="text-sm text-blue-600">
                      <strong>Telefon:</strong> {orderStatus.courier.phone}
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Sipariş Tutarı</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {orderStatus.orderAmount.toFixed(2)} TL
                  </p>
                </div>

                {orderStatus.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Sipariş Detayları</h3>
                    <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">
                      {orderStatus.notes}
                    </pre>
                  </div>
                )}

                {orderStatus.status === 'DELIVERED' && (
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Restoranı Değerlendir</h3>

                    {rating ? (
                      <div className="text-sm text-gray-700 space-y-1">
                        <p>Hız: {rating.speedScore}/10</p>
                        <p>Lezzet: {rating.tasteScore}/10</p>
                        <p>Fiyat Uygunluğu: {rating.priceScore}/10</p>
                        <p className="text-gray-500 text-xs">
                          Değerlendirme Tarihi: {new Date(rating.createdAt).toLocaleString('tr-TR')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid md:grid-cols-3 gap-3">
                          <label className="text-sm text-gray-600">
                            Hız (1-10)
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={ratingForm.speedScore}
                              onChange={(e) =>
                                setRatingForm((prev) => ({
                                  ...prev,
                                  speedScore: Number(e.target.value)
                                }))
                              }
                              className="mt-1 w-full border rounded px-2 py-1"
                            />
                          </label>
                          <label className="text-sm text-gray-600">
                            Lezzet (1-10)
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={ratingForm.tasteScore}
                              onChange={(e) =>
                                setRatingForm((prev) => ({
                                  ...prev,
                                  tasteScore: Number(e.target.value)
                                }))
                              }
                              className="mt-1 w-full border rounded px-2 py-1"
                            />
                          </label>
                          <label className="text-sm text-gray-600">
                            Fiyat (1-10)
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={ratingForm.priceScore}
                              onChange={(e) =>
                                setRatingForm((prev) => ({
                                  ...prev,
                                  priceScore: Number(e.target.value)
                                }))
                              }
                              className="mt-1 w-full border rounded px-2 py-1"
                            />
                          </label>
                        </div>

                        {ratingError && (
                          <p className="text-sm text-red-600">{ratingError}</p>
                        )}
                        {ratingSuccess && (
                          <p className="text-sm text-green-600">{ratingSuccess}</p>
                        )}

                        <button
                          onClick={async () => {
                            setRatingError('');
                            setRatingSuccess('');
                            const values = [
                              ratingForm.speedScore,
                              ratingForm.tasteScore,
                              ratingForm.priceScore
                            ];
                            if (values.some((value) => value < 1 || value > 10)) {
                              setRatingError('Puanlar 1 ile 10 arasında olmalıdır.');
                              return;
                            }
                            try {
                              const response = await marketplaceService.submitOrderRating(
                                orderStatus.orderNumber,
                                ratingForm
                              );
                              setRating(response.rating);
                              setRatingSuccess('Değerlendirmeniz alındı. Teşekkürler!');
                            } catch (err: unknown) {
                              const message = err && typeof err === 'object' && 'response' in err
                                ? ((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Değerlendirme kaydedilemedi')
                                : 'Değerlendirme kaydedilemedi';
                              setRatingError(message);
                            }
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Değerlendir
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <a
            href="/market"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Marketplace'e Dön
          </a>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
