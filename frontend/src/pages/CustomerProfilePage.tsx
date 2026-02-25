import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService, SavedAddress } from '../services/customerService';
import { useCustomerStore } from '../store/customerStore';
import { KKTCMapPicker } from '../components/KKTCMapPicker';
import '../styles/animations.css';

export default function CustomerProfilePage() {
  const navigate = useNavigate();
  const { customer, logout } = useCustomerStore();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: '',
    address: '',
    latitude: 0,
    longitude: 0,
    isDefault: false
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await customerService.getProfile();
      setAddresses(response.customer.savedAddresses);
    } catch (error) {
      console.error('Profile yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.label || !newAddress.address) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      await customerService.createAddress(newAddress);
      await loadProfile();
      setShowAddressForm(false);
      setNewAddress({
        label: '',
        address: '',
        latitude: 0,
        longitude: 0,
        isDefault: false
      });
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? ((error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Adres eklenemedi')
        : 'Adres eklenemedi';
      alert(errorMessage);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Bu adresi silmek istediğinizden emin misiniz?')) return;

    try {
      await customerService.deleteAddress(addressId);
      await loadProfile();
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? ((error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Adres silinemedi')
        : 'Adres silinemedi';
      alert(errorMessage);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await customerService.updateAddress(addressId, { isDefault: true });
      await loadProfile();
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? ((error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Varsayılan adres değiştirilemedi')
        : 'Varsayılan adres değiştirilemedi';
      alert(errorMessage);
    }
  };

  const handleLocationSelect = useCallback((lat: number, lng: number, address: string) => {
    setNewAddress(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address
    }));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/customer/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Profilim</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Çıkış Yap
            </button>
          </div>
          <div className="space-y-2">
            <p><strong>Ad:</strong> {customer?.name}</p>
            <p><strong>E-posta:</strong> {customer?.email}</p>
            <p><strong>Telefon:</strong> {customer?.phone}</p>
          </div>
          <div className="mt-4">
            <a href="/market" className="text-blue-600 hover:text-blue-700">
              ← Marketplace'e dön
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Kayıtlı Adreslerim</h2>
            <button
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showAddressForm ? 'İptal' : '+ Yeni Adres Ekle'}
            </button>
          </div>

          {showAddressForm && (
            <div className="mb-6 border-t pt-6 map-form-container">
              <h3 className="text-lg font-semibold mb-4">Yeni Adres Ekle</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adres Etiketi (Ev, İş, vb.)
                  </label>
                  <input
                    type="text"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Örn: Ev, İş"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Konumu Haritadan Seçin (KKTC)
                  </label>
                  <KKTCMapPicker
                    key="map-picker-form"
                    onLocationSelect={handleLocationSelect}
                    initialLat={newAddress.latitude || undefined}
                    initialLng={newAddress.longitude || undefined}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={newAddress.isDefault}
                    onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-700">
                    Varsayılan adres olarak ayarla
                  </label>
                </div>

                <button
                  onClick={handleAddAddress}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Adresi Kaydet
                </button>
              </div>
            </div>
          )}

          {addresses.length === 0 ? (
            <p className="text-gray-600">Henüz kayıtlı adresiniz yok.</p>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`border rounded-lg p-4 ${
                    address.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {address.label}
                        {address.isDefault && (
                          <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                            Varsayılan
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{address.address}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Koordinat: {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!address.isDefault && (
                        <button
                          onClick={() => handleSetDefault(address.id)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Varsayılan Yap
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(address.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
