import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  marketplaceService,
  MarketplaceMenuItem,
  MarketplaceMenuResponse,
  MarketplaceRestaurant
} from '../services/marketplaceService';
import { customerService, SavedAddress } from '../services/customerService';
import { useCustomerStore } from '../store/customerStore';

type CartMap = Record<string, number>;

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { customer } = useCustomerStore();
  const [restaurants, setRestaurants] = useState<MarketplaceRestaurant[]>([]);
  const [selectedRestaurantId,setSelectedRestaurantId] = useState<string>('');
  const [menuData, setMenuData] = useState<MarketplaceMenuResponse | null>(null);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartMap>({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setIsLoadingRestaurants(true);
        const response = await marketplaceService.getRestaurants();
        setRestaurants(response.restaurants);

        if (response.restaurants.length > 0) {
          setSelectedRestaurantId(response.restaurants[0].id);
        }
      } catch {
        setError('Restoranlar yüklenemedi.');
      } finally {
        setIsLoadingRestaurants(false);
      }
    };

    const loadAddresses = async () => {
      try {
        const response = await customerService.getProfile();
        setAddresses(response.customer.savedAddresses);
        const defaultAddress = response.customer.savedAddresses.find(addr => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        } else if (response.customer.savedAddresses.length > 0) {
          setSelectedAddressId(response.customer.savedAddresses[0].id);
        }
      } catch (error) {
        console.error('Adresler yüklenemedi:', error);
      }
    };

    loadRestaurants();
    loadAddresses();
  }, []);

  useEffect(() => {
    if (!selectedRestaurantId) {
      setMenuData(null);
      return;
    }

    const loadMenu = async () => {
      try {
        setIsLoadingMenu(true);
        setError(null);
        setCheckoutSuccess(null);
        const response = await marketplaceService.getRestaurantMenu(selectedRestaurantId);
        setMenuData(response);
        setCart({});
      } catch {
        setError('Menü yüklenemedi.');
      } finally {
        setIsLoadingMenu(false);
      }
    };

    loadMenu();
  }, [selectedRestaurantId]);

  const allMenuItems: MarketplaceMenuItem[] = menuData
    ? [...menuData.categories.flatMap((category) => category.menuItems), ...menuData.uncategorizedItems]
    : [];

  const menuItemById = new Map(allMenuItems.map((item) => [item.id, item]));

  const cartItems = Object.entries(cart)
    .filter(([, quantity]) => quantity > 0)
    .map(([menuItemId, quantity]) => ({
      menuItemId,
      quantity,
      item: menuItemById.get(menuItemId)
    }))
    .filter((row): row is { menuItemId: string; quantity: number; item: MarketplaceMenuItem } => Boolean(row.item));

  const cartTotal = cartItems.reduce((sum, row) => sum + (row.item.price * row.quantity), 0);

  const updateCartItem = (menuItemId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[menuItemId];
        return next;
      }

      return {
        ...prev,
        [menuItemId]: quantity
      };
    });
  };

  const handleCheckout = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedRestaurantId) {
      setError('Lütfen restoran seçin.');
      return;
    }

    if (!selectedAddressId) {
      setError('Lütfen teslimat adresi seçin.');
      return;
    }

    if (cartItems.length === 0) {
      setError('Sepet boş. Lütfen en az 1 ürün ekleyin.');
      return;
    }

    try {
      setCheckoutLoading(true);
      setError(null);
      setCheckoutSuccess(null);

      const basePayload = {
        restaurantId: selectedRestaurantId,
        savedAddressId: selectedAddressId,
        items: cartItems.map((row) => ({
          menuItemId: row.menuItemId,
          quantity: row.quantity
        }))
      };

      const payload = notes && notes.trim() 
        ? { ...basePayload, notes }
        : basePayload;

      const response = await marketplaceService.createOrder(payload);

      setCheckoutSuccess(`Sipariş alındı: ${response.order.orderNumber}`);
      setCart({});
      setNotes('');

      // Sipariş takip sayfasına yönlendir
      setTimeout(() => {
        navigate(`/track-order?orderNumber=${response.order.orderNumber}`);
      }, 1500);
    } catch (checkoutError: unknown) {
      const message = typeof checkoutError === 'object' && checkoutError !== null
        && 'response' in checkoutError
        && typeof (checkoutError as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (checkoutError as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Sipariş gönderilemedi.';
      setError(message || 'Sipariş gönderilemedi.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Yemek Sipariş Paneli</h1>
            <p className="text-sm text-gray-600 mt-1">
              Hoş geldiniz, {customer?.name}! 
            </p>
          </div>
          <div className="flex gap-3">
            <a 
              href="/customer/profile" 
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Profilim
            </a>
            <a 
              href="/track-order" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Sipariş Takibi
            </a>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {checkoutSuccess && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {checkoutSuccess}
            <a 
              href="/track-order" 
              className="ml-2 underline font-medium"
            >
              Siparişinizi takip edin
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Restoranlar</h2>

              {isLoadingRestaurants ? (
                <p className="text-sm text-gray-500">Yükleniyor...</p>
              ) : restaurants.length === 0 ? (
                <p className="text-sm text-gray-500">Restoran bulunamadı.</p>
              ) : (
                <div className="space-y-2">
                  {restaurants.map((restaurant) => (
                    <button
                      key={restaurant.id}
                      onClick={() => setSelectedRestaurantId(restaurant.id)}
                      className={`w-full text-left rounded-lg border px-3 py-3 transition ${
                        selectedRestaurantId === restaurant.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{restaurant.name}</p>
                      <p className="text-xs text-gray-600 mt-1">{restaurant.address}</p>
                      <p className="text-xs text-gray-500 mt-1">{restaurant.availableMenuItemCount} ürün</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Menü</h2>

              {isLoadingMenu ? (
                <p className="text-sm text-gray-500">Menü yükleniyor...</p>
              ) : !menuData ? (
                <p className="text-sm text-gray-500">Restoran seçiniz.</p>
              ) : (
                <div className="space-y-6">
                  {menuData.categories.map((category) => (
                    <div key={category.id}>
                      <h3 className="font-semibold text-gray-800 mb-2">{category.name}</h3>
                      {category.menuItems.length === 0 ? (
                        <p className="text-sm text-gray-500">Bu kategoride ürün yok.</p>
                      ) : (
                        <div className="space-y-2">
                          {category.menuItems.map((item) => (
                            <div key={item.id} className="rounded-lg border border-gray-200 px-3 py-2">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-medium text-gray-900">{item.name}</p>
                                  {item.description && (
                                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900">{item.price.toFixed(2)} ₺</p>
                                  <div className="mt-2 flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => updateCartItem(item.id, (cart[item.id] || 0) - 1)}
                                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                                      type="button"
                                    >
                                      -
                                    </button>
                                    <span className="text-sm min-w-5 text-center">{cart[item.id] || 0}</span>
                                    <button
                                      onClick={() => updateCartItem(item.id, (cart[item.id] || 0) + 1)}
                                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                                      type="button"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {menuData.uncategorizedItems.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Diğer</h3>
                      <div className="space-y-2">
                        {menuData.uncategorizedItems.map((item) => (
                          <div key={item.id} className="rounded-lg border border-gray-200 px-3 py-2">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-gray-900">{item.name}</p>
                                {item.description && (
                                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{item.price.toFixed(2)} ₺</p>
                                <div className="mt-2 flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => updateCartItem(item.id, (cart[item.id] || 0) - 1)}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    type="button"
                                  >
                                    -
                                  </button>
                                  <span className="text-sm min-w-5 text-center">{cart[item.id] || 0}</span>
                                  <button
                                    onClick={() => updateCartItem(item.id, (cart[item.id] || 0) + 1)}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                    type="button"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Sepet ve Teslimat</h3>

                    {cartItems.length === 0 ? (
                      <p className="text-sm text-gray-500 mb-4">Sepetiniz boş.</p>
                    ) : (
                      <div className="space-y-2 mb-4">
                        {cartItems.map((row) => (
                          <div key={row.menuItemId} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                            <span className="text-gray-700">{row.quantity}x {row.item.name}</span>
                            <span className="font-medium text-gray-900">{(row.item.price * row.quantity).toFixed(2)} ₺</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between border-t pt-2 text-sm">
                          <span className="font-medium text-gray-700">Toplam</span>
                          <span className="text-lg font-bold text-gray-900">{cartTotal.toFixed(2)} ₺</span>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleCheckout} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teslimat Adresi
                        </label>
                        {addresses.length === 0 ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                            <p className="text-sm text-yellow-800">
                              Henüz kayıtlı adresiniz yok.{' '}
                              <a href="/customer/profile" className="underline font-medium">
                                Profilinize gidin
                              </a>{' '}
                              ve adres ekleyin.
                            </p>
                          </div>
                        ) : (
                          <select
                            required
                            value={selectedAddressId}
                            onChange={(e) => setSelectedAddressId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Teslimat adresi seçin"
                            title="Teslimat adresi seçin"
                          >
                            <option value="">Adres seçin</option>
                            {addresses.map((address) => (
                              <option key={address.id} value={address.id}>
                                {address.label} - {address.address}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sipariş Notu (Opsiyonel)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Kapı kodu, ek talimatlar vb."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={checkoutLoading || cartItems.length === 0 || addresses.length === 0}
                        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                      >
                        {checkoutLoading ? 'Sipariş gönderiliyor...' : 'Siparişi Gönder'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
