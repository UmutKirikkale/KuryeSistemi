# 🚀 Kurye Sistemi - Giriş Rehberi

## ✅ Şu An Çalışıyor
- ✅ Backend: http://localhost:5001
- ✅ Frontend: http://localhost:3000

## ⚠️ Eksik: PostgreSQL Database

### Seçenek 1: Docker ile PostgreSQL (ÖNERİLEN)

1. **Docker Desktop'ı yükleyin:**
   - İndir: https://www.docker.com/products/docker-desktop
   - Mac için .dmg dosyasını çalıştırın

2. **PostgreSQL'i başlatın:**
   ```bash
   cd /Users/umutkirikkale/Desktop/KuryeSistemi
   docker-compose up -d
   ```

3. **Database migration yapın:**
   ```bash
   cd backend
   npm run prisma:migrate
   ```

### Seçenek 2: Homebrew ile PostgreSQL

```bash
# PostgreSQL yükle
brew install postgresql@14

# Başlat
brew services start postgresql@14

# Database oluştur
createdb kurye_sistemi

# Migration
cd /Users/umutkirikkale/Desktop/KuryeSistemi/backend
npm run prisma:migrate
```

---

## 📝 Kullanıcı Kaydı ve Giriş

### 1️⃣ RESTORAN Kullanıcısı Oluşturma

**API İsteği:**
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "restoran@test.com",
    "password": "123456",
    "name": "Test Restoran",
    "phone": "05551234567",
    "role": "RESTAURANT",
    "restaurantData": {
      "name": "Pizza Palace",
      "address": "Kadıköy, İstanbul",
      "phone": "02161234567",
      "commissionPerOrder": 100
    }
  }'
```

### 2️⃣ KURYE Kullanıcısı Oluşturma

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kurye@test.com",
    "password": "123456",
    "name": "Ahmet Yılmaz",
    "phone": "05559876543",
    "role": "COURIER",
    "courierData": {
      "vehicleType": "MOTORCYCLE"
    }
  }'
```

### 3️⃣ Giriş Yapma

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "restoran@test.com",
    "password": "123456"
  }'
```

**Alacağınız Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "restoran@test.com",
    "name": "Test Restoran",
    "role": "RESTAURANT"
  }
}
```

---

## 🌐 Frontend'den Giriş (Tarayıcı)

1. **Tarayıcınızda açın:** http://localhost:3000

2. **Kayıt Ol sayfasına gidin:**
   - Email: `restoran@test.com`
   - Şifre: `123456`
   - İsim: `Test Restoran`
   - Telefon: `05551234567`
   - Rol: **Restoran** (dropdown'dan seçin)
   - Restoran Adı: `Pizza Palace`
   - Adres: `Kadıköy, İstanbul`
   - Restoran Telefonu: `02161234567`

3. **Giriş Yap:**
   - Email: `restoran@test.com`
   - Şifre: `123456`

---

## 🔍 Sorun Giderme

### Backend çalışmıyor mu?
```bash
cd /Users/umutkirikkale/Desktop/KuryeSistemi/backend
npm run dev
```

### Frontend çalışmıyor mu?
```bash
cd /Users/umutkirikkale/Desktop/KuryeSistemi/frontend
npm run dev
```

### Database bağlantı hatası?
- PostgreSQL'in çalıştığından emin olun: `lsof -i:5432`
- .env dosyasını kontrol edin: `cat backend/.env`

---

## 🎯 Hızlı Test (PostgreSQL OLMADAN)

Eğer database kurmak istemiyorsanız, backend'i test modunda çalıştırabilirsiniz:

1. Frontend'e gidin: http://localhost:3000
2. Şu anki haliyle giriş formlarını görebilirsiniz
3. Database olmadığı için kayıt/giriş çalışmaz ama UI'ı inceleyebilirsiniz

**ÖNEMLİ:** Tam işlevsellik için PostgreSQL şart!
