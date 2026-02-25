import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
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

interface LocationPickerMapProps {
  initialPosition?: [number, number];
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
}

// Harita tıklama event handler
function LocationMarker({ position, onPositionChange }: { position: [number, number] | null; onPositionChange: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
    }
  });

  return position ? (
    <Marker position={position} icon={restaurantIcon} />
  ) : null;
}

export default function LocationPickerMap({
  initialPosition = [35.1264, 33.4299], // Kıbrıs varsayılan
  onLocationSelect,
  height = '400px'
}: LocationPickerMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialPosition[0] !== 35.1264 || initialPosition[1] !== 33.4299 ? initialPosition : null
  );

  useEffect(() => {
    if (initialPosition[0] !== 35.1264 || initialPosition[1] !== 33.4299) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  const handleLocationChange = (latlng: LatLng) => {
    const newPosition: [number, number] = [latlng.lat, latlng.lng];
    setPosition(newPosition);
    onLocationSelect(latlng.lat, latlng.lng);
  };

  return (
    <div>
      <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          📍 <strong>Harita üzerinde</strong> restoranınızın konumunu işaretleyin
        </p>
        {position && (
          <p className="text-xs text-blue-600 mt-1">
            Seçilen konum: {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </p>
        )}
      </div>
      <MapContainer
        center={initialPosition}
        zoom={13}
        style={{ height, width: '100%' }}
        className="z-0 rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} onPositionChange={handleLocationChange} />
      </MapContainer>
    </div>
  );
}
