import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/mapPicker.css';

// KKTC sınırları
const KKTC_BOUNDS: L.LatLngBoundsExpression = [
  [34.9, 32.4], // güneybatı
  [35.8, 34.6]  // kuzeydoğu
];

// Lefkoşa merkez
const KKTC_CENTER: [number, number] = [35.185566, 33.382276];

interface KKTCMapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export const KKTCMapPicker = ({ onLocationSelect, initialLat, initialLng }: KKTCMapPickerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      // Backend üzerinden reverse geocoding yap (CORS ve rate limit sorununu çözer)
      const response = await fetch(
        `http://localhost:5001/api/location/reverse-geocode?lat=${lat}&lng=${lng}`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      const address = data.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setSelectedAddress(address);
      onLocationSelect(lat, lng, address);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      const fallbackAddress = `Konum: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setSelectedAddress(fallbackAddress);
      onLocationSelect(lat, lng, fallbackAddress);
    }
  }, [onLocationSelect]);

  // Component mount kontrolü
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapContainer.current || mapRef.current) return;

    // Capture ref to avoid stale reference in cleanup
    const container = mapContainer.current;
    let isComponentMounted = true;

    // DOM'un tamamen hazır olmasını bekle (modal açılırken delay eklendi)
    const timer = setTimeout(() => {
      if (!isComponentMounted || !container || mapRef.current) return;

      const initialPosition: [number, number] = 
        initialLat && initialLng ? [initialLat, initialLng] : KKTC_CENTER;

      try {
        const newMap = L.map(container, {
          center: initialPosition,
          zoom: 10,
          maxBounds: KKTC_BOUNDS,
          maxBoundsViscosity: 0.5,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
          dragging: true,
          touchZoom: true,
          scrollWheelZoom: true,
          doubleClickZoom: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          minZoom: 8,
          maxZoom: 18
        }).addTo(newMap);

        // İlk marker
        if (initialLat && initialLng) {
          const initialMarker = L.marker(initialPosition, {
            draggable: true
          }).addTo(newMap);
          
          const handleMarkerDragEnd = () => {
            if (isComponentMounted) {
              const pos = initialMarker.getLatLng();
              reverseGeocode(pos.lat, pos.lng);
            }
          };
          
          initialMarker.on('dragend', handleMarkerDragEnd);
          markerRef.current = initialMarker;
          reverseGeocode(initialLat, initialLng);
        }

        // Harita tıklama eventi - once only
        let clickTimeout: ReturnType<typeof setTimeout> | null = null;
        const handleMapClick = (e: L.LeafletMouseEvent) => {
          if (!isComponentMounted) return;
          
          // Prevent multiple clicks
          if (clickTimeout) return;
          clickTimeout = setTimeout(() => {
            clickTimeout = null;
          }, 300);
          
          const { lat, lng } = e.latlng;
          const currentMap = mapRef.current;
          
          if (!currentMap) return;
          
          if (markerRef.current) {
            // Marker move sırasında dragend'i tetiklemeden setLatLng yap
            markerRef.current.off('dragend');
            markerRef.current.setLatLng([lat, lng]);
            
            // dragend listener'ını geri ekle
            const handleMarkerDragEnd = () => {
              if (isComponentMounted) {
                const pos = markerRef.current!.getLatLng();
                reverseGeocode(pos.lat, pos.lng);
              }
            };
            markerRef.current.on('dragend', handleMarkerDragEnd);
          } else {
            const newMarker = L.marker([lat, lng], {
              draggable: true
            }).addTo(currentMap);
            
            const handleMarkerDragEnd = () => {
              if (isComponentMounted) {
                const pos = newMarker.getLatLng();
                reverseGeocode(pos.lat, pos.lng);
              }
            };
            
            newMarker.on('dragend', handleMarkerDragEnd);
            markerRef.current = newMarker;
          }
          
          // Only call once for click, not on marker move
          reverseGeocode(lat, lng);
        };

        newMap.on('click', handleMapClick);
        mapRef.current = newMap;

        // Harita fully rendered olduktan sonra size invalidate et
        const invalidateSizeTimer = setTimeout(() => {
          if (isComponentMounted && newMap && newMap.getContainer()) {
            try {
              newMap.invalidateSize();
            } catch (e) {
              console.error('Error invalidating size:', e);
            }
          }
        }, 500);

        return () => {
          clearTimeout(invalidateSizeTimer);
        };
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }, 200);

    return () => {
      isComponentMounted = false;
      clearTimeout(timer);
      
      // Marker cleanup
      if (markerRef.current) {
        try {
          markerRef.current.off();
          markerRef.current.remove();
        } catch (e) {
          console.error('Error removing marker:', e);
        }
        markerRef.current = null;
      }
      
      // Map cleanup - reverse order
      if (mapRef.current) {
        try {
          // Tümü off yapıldı
          mapRef.current.off();
          
          // Stop editing gibi işlemleri durdur
          if ((mapRef.current as any).pm) {
            try {
              (mapRef.current as any).pm.disable();
            } catch (e) {}
          }
          
          // Container temizle
          const mapContainer = mapRef.current.getContainer();
          if (mapContainer && mapContainer.parentNode) {
            mapContainer.innerHTML = '';
          }
          
          // Son olarak remove
          mapRef.current.remove();
        } catch (e) {
          console.error('Error cleaning up map:', e);
        }
        mapRef.current = null;
      }
    };
  }, [mounted, initialLat, initialLng, reverseGeocode]);

  return (
    <div className="map-picker-container">
      <div 
        ref={mapContainer} 
        className="map-picker-wrapper map-container"
      />
      {selectedAddress && (
        <div className="map-address-display">
          <p>
            <strong>Seçilen Konum:</strong> {selectedAddress}
          </p>
        </div>
      )}
      <p className="map-help-text">
        💡 Harita üzerinde tıklayarak veya işaretçiyi sürükleyerek konumunuzu seçin.
      </p>
    </div>
  );
};
