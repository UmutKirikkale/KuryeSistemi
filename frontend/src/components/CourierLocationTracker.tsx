import { useEffect, useState } from 'react';
import { useLocationStore } from '../store/locationStore';
import { wsService } from '../services/websocket';
import { locationService } from '../services/locationService';
import { Navigation, MapPin } from 'lucide-react';

export default function CourierLocationTracker() {
  const { myLocation, setMyLocation, isTracking, setIsTracking } = useLocationStore();
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert('Tarayıcınız konum özelliğini desteklemiyor');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Store'u güncelle
        setMyLocation(latitude, longitude);

        // WebSocket ile sunucuya gönder
        try {
          wsService.updateCourierLocation(latitude, longitude, accuracy);
        } catch (error) {
          console.error('Failed to update location:', error);
        }

        // REST fallback ile de sunucuya gönder
        locationService
          .updateLocation(latitude, longitude, accuracy)
          .catch((error) => {
            console.error('Failed to update location via API:', error);
          });
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Konum bilgisi alınamadı. Lütfen konum izinlerini kontrol edin.');
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    setWatchId(id);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Konum Takibi</h3>
          <p className="text-sm text-gray-600">
            GPS takibini aktifleştirerek konumunuzu paylaşın
          </p>
        </div>
        <button
          onClick={toggleTracking}
          className={`btn flex items-center gap-2 ${
            isTracking ? 'btn-danger' : 'btn-primary'
          }`}
        >
          <Navigation className={`w-4 h-4 ${isTracking ? 'animate-pulse' : ''}`} />
          {isTracking ? 'Takibi Durdur' : 'Takibi Başlat'}
        </button>
      </div>

      {isTracking && myLocation.latitude && myLocation.longitude && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">Konum takibi aktif</p>
              <p className="text-sm text-green-700 mt-1">
                Enlem: {myLocation.latitude.toFixed(6)}, Boylam:{' '}
                {myLocation.longitude.toFixed(6)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Konumunuz anlık olarak restoranlara iletiliyor
              </p>
            </div>
          </div>
        </div>
      )}

      {!isTracking && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            Konum takibi devre dışı. Siparişleri almak ve konumunuzu paylaşmak için
            takibi başlatın.
          </p>
        </div>
      )}
    </div>
  );
}
