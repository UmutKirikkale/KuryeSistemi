# Frontend - Kurye Sistemi

React, TypeScript ve Tailwind CSS ile geliştirilmiş modern web uygulaması.

## Kurulum

```bash
npm install
```

## Ortam Değişkenleri

`.env` dosyasını oluşturun:

```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
```

Vercel production için Environment Variables bölümünde mutlaka şu değerleri ekleyin:

```env
VITE_API_URL=https://your-backend-domain.com/api
VITE_WS_URL=https://your-backend-domain.com
```

## Çalıştırma

```bash
# Development mode
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Proje Yapısı

```
src/
├── components/        # React bileşenleri
│   ├── MapComponent.tsx
│   ├── CreateOrderModal.tsx
│   ├── OrderList.tsx
│   ├── FinancialSummary.tsx
│   └── CourierLocationTracker.tsx
├── pages/            # Sayfa bileşenleri
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── RestaurantDashboard.tsx
│   └── CourierDashboard.tsx
├── services/         # API ve servis katmanları
│   ├── api.ts
│   ├── websocket.ts
│   ├── authService.ts
│   ├── orderService.ts
│   ├── locationService.ts
│   └── financialService.ts
├── store/           # Zustand state management
│   ├── authStore.ts
│   ├── orderStore.ts
│   └── locationStore.ts
├── App.tsx          # Ana uygulama bileşeni
├── main.tsx         # Giriş noktası
└── index.css        # Global stiller
```

## Özellikler

- **Responsive Design**: Mobil ve desktop uyumlu
- **Real-time Updates**: WebSocket ile canlı güncellemeler
- **Interactive Maps**: Leaflet ile interaktif haritalar
- **Type-safe**: TypeScript ile tam type güvenliği
- **State Management**: Zustand ile basit ve etkili state yönetimi
- **Modern UI**: Tailwind CSS ile modern ve temiz arayüz

## Build

```bash
npm run build
```

Build dosyaları `dist/` klasörüne oluşturulur.

## Linting

```bash
npm run lint
```
