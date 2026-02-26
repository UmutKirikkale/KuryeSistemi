# Backend - Kurye Sistemi API

Node.js, Express ve TypeScript ile geliştirilmiş RESTful API.

## Kurulum

```bash
npm install
```

## Ortam Değişkenleri

`.env` dosyasını oluşturun:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/kurye_sistemi?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000,https://your-frontend.vercel.app"
```

`CORS_ORIGIN` birden fazla origin destekler (virgülle ayırın).

## Veritabanı

### Migration

```bash
# Yeni migration oluştur
npm run prisma:migrate

# Prisma Client generate et
npm run prisma:generate

# Prisma Studio'yu aç
npm run prisma:studio
```

## Çalıştırma

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## Proje Yapısı

```
src/
├── config/          # Yapılandırma dosyaları
│   ├── database.ts
│   └── websocket.ts
├── controllers/     # Request handler'lar
│   ├── auth.controller.ts
│   ├── order.controller.ts
│   ├── location.controller.ts
│   └── financial.controller.ts
├── middleware/      # Express middleware'ler
│   ├── auth.ts
│   └── errorHandler.ts
├── routes/         # API route'ları
│   ├── auth.routes.ts
│   ├── order.routes.ts
│   ├── location.routes.ts
│   └── financial.routes.ts
└── index.ts        # Ana uygulama dosyası
```

## API Dokümantasyonu

API endpoint'leri için ana README dosyasına bakın.
