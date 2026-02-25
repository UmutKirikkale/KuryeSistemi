import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Marker icon'larını düzelt
const courierIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface CourierLocation {
  courierId: string;
  courierName: string;
  latitude: number;
  longitude: number;
  vehicleType?: string;
  lastUpdate?: string;
}

interface MapComponentProps {
  courierLocations: CourierLocation[];
  center?: [number, number];
  zoom?: number;
}

export default function MapComponent({
  courierLocations,
  center = [35.1264, 33.4299], // Kıbrıs varsayılan
  zoom = 12
}: MapComponentProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {courierLocations.map((location) => (
        <Marker
          key={location.courierId}
          position={[location.latitude, location.longitude]}
          icon={courierIcon}
        >
          <Popup>
            <div>
              <h3 className="font-semibold">{location.courierName || 'Kurye'}</h3>
              {location.vehicleType && (
                <p className="text-sm text-gray-600">Araç: {location.vehicleType}</p>
              )}
              {location.lastUpdate && (
                <p className="text-xs text-gray-500">
                  Son güncelleme: {new Date(location.lastUpdate).toLocaleTimeString('tr-TR')}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
