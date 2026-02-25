# 🚀 Kurye Sistemi - Teslimat ve Finans Yönetim Sistemi

Restoranlar ve kuryeler için entegre çalışan, rol bazlı kontrol panellerine sahip, web tabanlı bir teslimat ve finans yönetim sistemi.

## ✨ Özellikler

### 🔐 Gelişmiş Yetkilendirme
- Rol bazlı erişim kontrolü (Restoran, Kurye, Admin)
- JWT ile güvenli kimlik doğrulama
- Her rol için özelleştirilmiş dashboard'lar

### 📍 Canlı GPS Takibi
- Kuryelerin anlık konum takibi
- WebSocket ile gerçek zamanlı güncelleme
- Leaflet harita entegrasyonu
- Konum geçmişi kayıtları

### 💰 Otomatik Finans Yönetimi
- Restoran brüt kazanç hesaplama
- Kurye hakediş hesaplama
- Sistem komisyon yönetimi
- Net bakiye hesaplama
- Günlük ve aylık raporlar

### 📦 Sipariş Yönetimi
- Sipariş oluşturma ve takibi
- Otomatik kurye ataması
- Durum güncellemeleri
- Gerçek zamanlı bildirimler

## 🛠️ Teknoloji Stack

### Backend
- **Node.js** & **Express** - API server
- **TypeScript** - Type-safe development
- **PostgreSQL** - İlişkisel veritabanı
- **Prisma ORM** - Database ORM
- **Socket.io** - Real-time WebSocket
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Zod** - Schema validation

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Routing
- **Leaflet** - Maps
- **Socket.io Client** - WebSocket client
- **Axios** - HTTP client
- **Lucide React** - Icons

## 📋 Gereksinimler

- Node.js 18+ 
- PostgreSQL 14+
- npm veya yarn

## 🚀 Kurulum

### 1. Projeyi Klonlayın
```bash
git clone <repository-url>
cd KuryeSistemi
```

### 2. Backend Kurulumu

```bash
cd backend

# Bağımlılıkları yükleyin
npm install

# .env dosyasını oluşturun
cp .env.example .env

# .env dosyasını düzenleyin ve veritabanı bağlantı bilgilerinizi girin
# DATABASE_URL="postgresql://username:password@localhost:5432/kurye_sistemi"
# JWT_SECRET="your-secret-key"

# Prisma veritabanını oluşturun ve migrate edin
npm run prisma:migrate

# Prisma Client'ı generate edin
npm run prisma:generate

# Development modunda çalıştırın
npm run dev
```

Backend varsayılan olarak `http://localhost:5000` adresinde çalışacaktır.

### 3. Frontend Kurulumu

```bash
cd frontend

# Bağımlılıkları yükleyin
npm install

# .env dosyasını oluşturun
cp .env.example .env

# .env dosyasını düzenleyin (varsayılan değerler genellikle yeterlidir)
# VITE_API_URL=http://localhost:5000/api
# VITE_WS_URL=http://localhost:5000

# Development modunda çalıştırın
npm run dev
```

Frontend varsayılan olarak `http://localhost:3000` adresinde çalışacaktır.

## 🐳 Docker ile Kurulum (Opsiyonel)

```bash
# PostgreSQL'i Docker ile çalıştırın
docker-compose up -d

# Backend ve Frontend'i yukarıdaki adımları takip ederek çalıştırın
```

## 📖 Kullanım

### Restoran Hesabı Oluşturma

1. `http://localhost:3000/register` adresine gidin
2. "Restoran" seçeneğini seçin
3. Gerekli bilgileri doldurun
4. Kayıt olun ve giriş yapın

### Kurye Hesabı Oluşturma

1. `http://localhost:3000/register` adresine gidin
2. "Kurye" seçeneğini seçin
3. Gerekli bilgileri doldurun (araç tipi vb.)
4. Kayıt olun ve giriş yapın

### Restoran Kullanımı

- **Sipariş Oluşturma**: Dashboard'da "Yeni Sipariş" butonuna tıklayın
- **Kuryeleri Takip Etme**: "Harita" sekmesinde kuryelerin canlı konumunu görüntüleyin
- **Finansal Rapor**: "Finansal Rapor" sekmesinde gelir-gider detaylarını inceleyin

### Kurye Kullanımı

- **Müsaitliği Ayarlama**: Sağ üst köşedeki "Müsait/Meşgul" butonunu kullanın
- **GPS Takibi**: "Takibi Başlat" butonu ile konum paylaşımını aktif edin
- **Sipariş Alma**: "Bekleyen Siparişler" listesinden sipariş seçip "Siparişi Al" butonuna tıklayın
- **Durum Güncelleme**: Sırasıyla "Teslim Aldım" ve "Teslim Ettim" butonlarını kullanın

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Giriş yapma
- `GET /api/auth/profile` - Profil bilgisi

### Orders
- `POST /api/orders` - Sipariş oluşturma (Restoran)
- `GET /api/orders` - Siparişleri listeleme
- `GET /api/orders/:id` - Sipariş detayı
- `POST /api/orders/:id/assign` - Sipariş atama (Kurye)
- `PATCH /api/orders/:id/status` - Durum güncelleme

### Location
- `POST /api/location/update` - Konum güncelleme (Kurye)
- `GET /api/location/couriers` - Tüm kurye konumları (Restoran)
- `GET /api/location/history/:courierId` - Konum geçmişi
- `POST /api/location/toggle-availability` - Müsaitlik durumu

### Financial
- `GET /api/financial/restaurant` - Restoran finansalları
- `GET /api/financial/courier` - Kurye kazançları
- `GET /api/financial/daily` - Günlük rapor
- `GET /api/financial/monthly` - Aylık rapor

## 🔄 WebSocket Events

### Client'tan Sunucuya
- `courier:location:update` - Kurye konum güncelleme

### Sunucudan Client'a
- `courier:location:broadcast` - Kurye konumu yayını
- `order:status:update` - Sipariş durumu değişikliği
- `order:new` - Yeni sipariş bildirimi

## 📊 Veritabanı Şeması

Detaylı veritabanı şeması için `backend/prisma/schema.prisma` dosyasına bakın.

### Ana Tablolar
- **users** - Kullanıcılar (Restoran ve Kurye)
- **restaurants** - Restoran bilgileri
- **courier_profiles** - Kurye profilleri
- **orders** - Siparişler
- **location_history** - Konum geçmişi
- **financial_transactions** - Finansal işlemler

## 🧪 Test

```bash
# Backend testleri
cd backend
npm test

# Frontend testleri
cd frontend
npm test
```

## 📝 Geliştirme Notları

### TypeScript Strict Mode
Proje strict mode ile geliştirilmiştir. Tüm değişkenler ve fonksiyonlar type-safe'tir.

### Error Handling
- Tüm API endpoint'leri merkezi error handler kullanır
- Frontend'de try-catch blokları ile hata yönetimi yapılır
- Kullanıcıya anlamlı hata mesajları gösterilir

### Security
- JWT token'lar HttpOnly değildir (localStorage kullanılır)
- Production ortamında HTTPS kullanılmalıdır
- CORS yapılandırması production için güncellen melidir
- Environment variables hassas bilgiler için kullanılır

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişiklikleri commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altındadır.

## 📧 İletişim

Sorularınız için issue açabilirsiniz.

---

⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!
