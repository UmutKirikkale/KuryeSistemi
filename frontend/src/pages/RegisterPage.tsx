import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuthStore();
  const [role, setRole] = useState<'RESTAURANT' | 'COURIER'>('RESTAURANT');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    restaurantName: '',
    restaurantAddress: '',
    restaurantPhone: '',
    vehicleType: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        role
      };

      if (role === 'RESTAURANT') {
        data.restaurantData = {
          name: formData.restaurantName,
          address: formData.restaurantAddress,
          phone: formData.restaurantPhone
        };
      } else {
        data.courierData = {
          vehicleType: formData.vehicleType
        };
      }

      await register(data);
      navigate('/dashboard');
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <UserPlus className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Kayıt Ol</h2>
            <p className="text-gray-600 mt-2">Hesap oluşturun ve başlayın</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="label">Hesap Türü</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('RESTAURANT')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    role === 'RESTAURANT'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">Restoran</div>
                  <div className="text-sm text-gray-600">Siparişleri yönetin</div>
                </button>
                <button
                  type="button"
                  disabled
                  className="p-4 rounded-lg border-2 border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed"
                >
                  <div className="font-semibold">Kurye</div>
                  <div className="text-sm text-red-600">Yönetici tarafından oluşturulur</div>
                </button>
              </div>
            </div>

            {/* Common Fields */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">E-posta</label>
                <input
                  type="email"
                  className="input"
                  placeholder="ornek@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Şifre</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Ad Soyad</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ahmet Yılmaz"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="0555 123 4567"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Restaurant Fields */}
            {role === 'RESTAURANT' && (
              <>
                <div>
                  <label className="label">Restoran Adı</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Lezzet Durağı"
                    value={formData.restaurantName}
                    onChange={(e) =>
                      setFormData({ ...formData, restaurantName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Restoran Adresi</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Adres"
                      value={formData.restaurantAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, restaurantAddress: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Restoran Telefonu</label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="0555 123 4567"
                      value={formData.restaurantPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, restaurantPhone: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Courier Fields */}
            {role === 'COURIER' && (
              <div>
                <label htmlFor="vehicleType" className="label">Araç Tipi</label>
                <select
                  id="vehicleType"
                  title="Araç Tipi"
                  className="input"
                  value={formData.vehicleType}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleType: e.target.value })
                  }
                >
                  <option value="">Seçiniz</option>
                  <option value="Bisiklet">Bisiklet</option>
                  <option value="Motosiklet">Motosiklet</option>
                  <option value="Araba">Araba</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Giriş yapın
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
