import { useState } from 'react';
import { useOrderStore } from '../store/orderStore';
import { X } from 'lucide-react';

interface CreateOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOrderModal({ onClose, onSuccess }: CreateOrderModalProps) {
  const { createOrder, isLoading } = useOrderStore();
  const platformCommissionHints: Record<string, number> = {
    YEMEKSEPETI: 35,
    FEEDME: 25,
    GETIRYEMEK: 30,
    TRENDYOLYEMEK: 30,
    DIGER: 20
  };
  const [formData, setFormData] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    pickupLatitude: 35.1264,
    pickupLongitude: 33.4299,
    deliveryLatitude: 35.1364,
    deliveryLongitude: 33.4399,
    orderAmount: '',
    customerName: '',
    customerPhone: '',
    sourcePlatform: '',
    externalOrderId: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sourcePlatform = formData.sourcePlatform.trim();
    const externalOrderId = formData.externalOrderId.trim();

    if ((sourcePlatform && !externalOrderId) || (!sourcePlatform && externalOrderId)) {
      alert('Platform siparişi için platform adı ve platform sipariş numarası birlikte girilmelidir.');
      return;
    }

    try {
      await createOrder({
        ...formData,
        sourcePlatform: sourcePlatform || undefined,
        externalOrderId: externalOrderId || undefined,
        orderAmount: parseFloat(formData.orderAmount)
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Yeni Sipariş</h2>
          <button
            type="button"
            onClick={onClose}
            title="Kapat"
            aria-label="Kapat"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Pickup Info */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Alış Bilgileri</h3>
            <div>
              <label htmlFor="pickupAddress" className="label">Alış Adresi</label>
              <input
                id="pickupAddress"
                type="text"
                className="input"
                value={formData.pickupAddress}
                onChange={(e) =>
                  setFormData({ ...formData, pickupAddress: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label htmlFor="pickupLatitude" className="label">Enlem</label>
                <input
                  id="pickupLatitude"
                  type="number"
                  step="any"
                  className="input"
                  value={formData.pickupLatitude}
                  onChange={(e) =>
                    setFormData({ ...formData, pickupLatitude: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <label htmlFor="pickupLongitude" className="label">Boylam</label>
                <input
                  id="pickupLongitude"
                  type="number"
                  step="any"
                  className="input"
                  value={formData.pickupLongitude}
                  onChange={(e) =>
                    setFormData({ ...formData, pickupLongitude: parseFloat(e. target.value) })
                  }
                  required
                />
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Teslimat Bilgileri</h3>
            <div>
              <label htmlFor="deliveryAddress" className="label">Teslimat Adresi</label>
              <input
                id="deliveryAddress"
                type="text"
                className="input"
                value={formData.deliveryAddress}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryAddress: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label htmlFor="deliveryLatitude" className="label">Enlem</label>
                <input
                  id="deliveryLatitude"
                  type="number"
                  step="any"
                  className="input"
                  value={formData.deliveryLatitude}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryLatitude: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <label htmlFor="deliveryLongitude" className="label">Boylam</label>
                <input
                  id="deliveryLongitude"
                  type="number"
                  step="any"
                  className="input"
                  value={formData.deliveryLongitude}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryLongitude: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Müşteri Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="customerName" className="label">Müşteri Adı</label>

            {/* Platform Integration Info */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Platform Siparişi (Opsiyonel)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sourcePlatform" className="label">Platform</label>
                  <select
                    id="sourcePlatform"
                    className="input"
                    value={formData.sourcePlatform}
                    onChange={(e) => setFormData({ ...formData, sourcePlatform: e.target.value })}
                  >
                    <option value="">Seçiniz</option>
                    <option value="YEMEKSEPETI">Yemeksepeti</option>
                    <option value="FEEDME">FeedMe</option>
                    <option value="GETIRYEMEK">GetirYemek</option>
                    <option value="TRENDYOLYEMEK">TrendyolYemek</option>
                    <option value="DIGER">Diğer</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="externalOrderId" className="label">Platform Sipariş Numarası</label>
                  <input
                    id="externalOrderId"
                    type="text"
                    className="input"
                    value={formData.externalOrderId}
                    onChange={(e) => setFormData({ ...formData, externalOrderId: e.target.value })}
                    placeholder="Örn: YS-123456"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Aynı platform sipariş numarası ikinci kez girilirse sistem otomatik engeller.
              </p>
              {formData.sourcePlatform && (
                <p className="text-xs text-indigo-700 mt-1">
                  Bu platform için ekstra komisyon şablonu: +{platformCommissionHints[formData.sourcePlatform] || 0} ₺
                </p>
              )}
            </div>
                <input
                  id="customerName"
                  type="text"
                  className="input"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label htmlFor="customerPhone" className="label">Müşteri Telefonu</label>
                <input
                  id="customerPhone"
                  type="tel"
                  className="input"
                  value={formData.customerPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, customerPhone: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </div>

          {/* Financial Info */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Finansal Bilgiler</h3>
            <div>
              <label htmlFor="orderAmount" className="label">Sipariş Tutarı (₺)</label>
              <input
                id="orderAmount"
                type="number"
                step="0.01"
                className="input"
                value={formData.orderAmount}
                onChange={(e) =>
                  setFormData({ ...formData, orderAmount: e.target.value })
                }
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Kurye ücreti sistem tarafından otomatik hesaplanır.
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="label">Notlar (Opsiyonel)</label>
            <textarea
              id="notes"
              className="input"
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 btn btn-primary disabled:opacity-50"
            >
              {isLoading ? 'Oluşturuluyor...' : 'Sipariş Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
