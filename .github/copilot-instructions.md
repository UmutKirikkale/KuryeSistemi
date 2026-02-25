# Kurye Sistemi - Teslimat ve Finans Yönetim Sistemi

## Proje Hakkında
Bu proje, restoranlar ve kuryeler için entegre çalışan, rol bazlı kontrol panellerine sahip, web tabanlı bir teslimat ve finans yönetim sistemidir.

## Teknoloji Stack
- **Backend**: Node.js, Express, TypeScript, Socket.io
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React, TypeScript, Tailwind CSS, Leaflet
- **Authentication**: JWT with role-based access control

## Özellikler
- Rol bazlı yetkilendirme (Restoran ve Kurye)
- Canlı GPS takibi (WebSocket)
- Otomatik finans hesaplama
- Sipariş yönetimi
- Finansal raporlama

## Kodlama Standartları
- TypeScript strict mode kullan
- Async/await tercih et
- Error handling her endpoint'te olmalı
- API response'lar tutarlı format kullanmalı
- Environment variables kullan (hassas bilgiler için)

## Progress

- [x] Copilot instructions dosyası oluşturuldu
- [x] Backend proje yapısı oluşturuldu
- [x] PostgreSQL şeması tasarlandı (Prisma ORM)
- [x] API endpoints implement edildi
- [x] WebSocket GPS tracking eklendi
- [x] Frontend React yapısı oluşturuldu
- [x] Rol bazlı dashboard'lar implement edildi
- [x] Canlı GPS takibi eklendi (Leaflet)
- [x] Dokümantasyon tamamlandı

## Geliştirme Durumu

✅ **Tamamlanan Özellikler:**
- Backend API (Auth, Orders, Location, Financial)
- WebSocket real-time communication
- Frontend React application
- Role-based dashboards (Restaurant & Courier)
- Live GPS tracking with Leaflet maps
- Financial reporting and calculations
- Comprehensive documentation

## Sonraki Adımlar

1. **Kurulum ve Test:**
   ```bash
   # PostgreSQL başlat
   docker-compose up -d
   
   # Backend
   cd backend
   npm install
   npm run prisma:migrate
   npm run dev
   
   # Frontend
   cd frontend
   npm install
   npm run dev
   ```

2. **Production Deployment:**
   - Environment variables ayarlama
   - Database migration
   - HTTPS yapılandırması
   - CORS ayarları

3. **Gelecek Geliştirmeler:**
   - Unit ve integration testleri
   - Admin dashboard
   - Bildirim sistemi (email, SMS)
   - Performans optimizasyonları
   - Mobile app (React Native)
