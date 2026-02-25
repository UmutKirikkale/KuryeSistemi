# 📦 Kurye Sistemi - Kullanım Kılavuzu

## 🎯 Sistem Özellikleri

Bu sistem, restoranlar ve kuryeler arasında sipariş ve teslimat yönetimini sağlar. **Kurye kaydı artık sadece admin panelinden yapılabilir.**

---

## 👥 Kullanıcı Rolleri ve Kayıt

### 1. 🍕 **RESTORAN**
- **Kayıt:** Kendi kendine kayıt olabilir (http://localhost:3000/register)
- **Özellikler:**
  - Sipariş oluşturma
  - Kurye atama
  - Sipariş takibi
  - Canlı GPS izleme
  - Finansal raporlar

### 2. 🏍️ **KURYE**
- **Kayıt:** ❌ Kendi kendine kayıt **YAPAMAZ**
- **Nasıl Oluşturulur:** ✅ Sadece **admin panelinden** yönetici tarafından oluşturulur
- **Giriş:** Admin'in belirlediği email ve şifre ile giriş yapabilir
- **Özellikler:**
  - Atanan siparişleri görme
  - Sipariş durumu güncelleme (ASSIGNED → PICKED_UP → DELIVERED)
  - GPS lokasyon paylaşımı
  - Müsaitlik durumu yönetimi
  - Kazanç takibi

### 3. 👑 **ADMİN** (YÖNETİCİ)
- **Kayıt:** Test için önceden oluşturulmuş hesap var
- **Özellikler:**
  - **Kurye oluşturma** (email ve şifre belirleme) ⭐
  - **Kurye silme** (aktif sipariş kontrolü ile) ⭐ YENİ
  - **Kurye listesi** görüntüleme ⭐ YENİ
  - Sistem geneli istatistikler
  - Tüm kullanıcıları görüntüleme
  - Tüm siparişleri izleme
  - Sistem durumu kontrolü

---

## 🚀 Kullanım Senaryoları

### Senaryo 1: Yeni Kurye Ekleme (Admin)

1. **Admin olarak giriş yap:**
   - Email: `admin@test.com`
   - Şifre: `123456`
   - URL: http://localhost:3000/login

2. **Admin Dashboard'da:**
   - "Kuryeler" kartında **"Ekle"** butonuna tıkla

3. **Kurye bilgilerini gir:**
   - Ad Soyad: `Ali Kurye`
   - E-posta: `ali@kurye.com`
   - Şifre: `guvenli123` (Kurye bu şifre ile giriş yapacak)
   - Telefon: `05551234567`
   - Araç Tipi: `Motosiklet`, `Bisiklet` veya `Araba`

4. **"Oluştur"** butonuna tıkla
   - ✅ Kurye hesabı aktif olarak oluşturulur
   - ✅ Kurye hemen giriş yapabilir

### Senaryo 2: Kurye Silme (Admin) ⭐ YENİ

1. **Admin Dashboard'da:**
   - "Kuryeler" kartında **"Liste"** butonuna tıkla

2. **Kurye listesi açılır:**
   - Tüm kuryeler görüntülenir
   - Her kurye: Ad, email, telefon, araç tipi, müsaitlik durumu

3. **Silmek istediğin kuryeyi bul:**
   - Kurye'nin yanındaki **"Sil"** butonuna tıkla

4. **Onay penceresi:**
   - "Kurye hesabını silmek istediğinizden emin misiniz?"
   - **Tamam** → Kurye silinir
   - **İptal** → İşlem iptal edilir

⚠️ **Önemli:** Aktif siparişi olan kuryeler silinemez!

```
Hata: "Cannot delete courier with active orders"
→ Kurye'nin tüm siparişlerinin tamamlanmasını bekleyin
```

### Senaryo 3: Kurye Olarak Giriş

1. **Login sayfasına git:** http://localhost:3000/login

2. **Admin'in verdiği bilgilerle giriş yap:**
   - Email: Admin'in belirlediği email
   - Şifre: Admin'in belirlediği şifre

3. **Kurye Dashboard'a yönlendirilirsin:**
   - Atanan siparişler listesi
   - GPS lokasyon paylaşımı
   - Sipariş durum güncelleme
   - Kazanç özeti

### Senaryo 4: Restoran Olarak Kayıt ve Sipariş

1. **Kayıt ol:** http://localhost:3000/register
   - "Restoran" seç
   - Bilgilerini gir (email, şifre, restoran adı, adres, telefon)

2. **Giriş yap ve sipariş oluştur:**
   - Dashboard'da "Yeni Sipariş" butonuna tıkla
   - Teslimat adresini gir
   - Sipariş tutarını belirle
   - Müsait kurye seç
   - Oluştur

3. **Siparişi takip et:**
   - Canlı harita üzerinde kuryenin konumunu izle
   - Sipariş durumunu gör (ASSIGNED → PICKED_UP → DELIVERED)

---

## 🔐 Test Hesapları

### 👑 YÖNETİCİ (Admin)
```
Email: admin@test.com
Şifre: 123456
Dashboard: Yönetici Paneli
```

### 🍕 RESTORAN
```
Email: restoran@test.com
Şifre: 123456
Dashboard: Restoran Paneli
```

### 🏍️ KURYE (Varsa)
```
Email: kurye@test.com
Şifre: 123456
Dashboard: Kurye Paneli
```

---

## 📊 Admin Panel - Kurye Yönetimi

### Kurye Oluşturma API

**Endpoint:** `POST /api/admin/couriers`

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "yeni@kurye.com",
  "password": "guvenli_sifre",
  "name": "Mehmet Kurye",
  "phone": "05551234567",
  "vehicleType": "Motosiklet"
}
```

**Response:**
```json
{
  "message": "Courier created successfully",
  "courier": {
    "id": "uuid",
    "email": "yeni@kurye.com",
    "name": "Mehmet Kurye",
    "phone": "05551234567",
    "vehicleType": "Motosiklet",
    "isAvailable": true
  }
}
```

### Terminal'den Kurye Oluşturma

```bash
# 1. Admin token al
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"123456"}' | jq -r '.token')

# 2. Yeni kurye oluştur
curl -X POST http://localhost:5001/api/admin/couriers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "yeni@kurye.com",
    "password": "123456",
    "name": "Yeni Kurye",
    "phone": "05551234567",
    "vehicleType": "Motosiklet"
  }'
```

### Kurye Silme API ⭐ YENİ

**Endpoint:** `DELETE /api/admin/couriers/:courierId`

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**Response (Başarılı):**
```json
{
  "message": "Courier deleted successfully"
}
```

**Response (Hata - Aktif Sipariş Var):**
```json
{
  "message": "Cannot delete courier with active orders"
}
```

### Terminal'den Kurye Silme

```bash
# 1. Admin token al (yukarıdaki komutu kullan)

# 2. Kurye ID'si ile kurye sil
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:5001/api/admin/couriers/{KURYE_USER_ID}

# Örnek:
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:5001/api/admin/couriers/aadddc21-9d61-4405-b1d6-794104919794
```

⚠️ **Önemli Notlar:**
- Aktif siparişi olan kuryeler silinemez
- Sipariş durumu: `ASSIGNED` veya `PICKED_UP` ise silme işlemi başarısız olur
- Kurye silindikten sonra tüm veriler kalıcı olarak silinir

---

## 🔄 Sipariş İş Akışı

### 1. Sipariş Durumları

```
PENDING     → Sipariş oluşturuldu, kurye atanmadı
ASSIGNED    → Kurye atandı, teslimat bekliyor
PICKED_UP   → Kurye siparişi aldı, yolda
DELIVERED   → Teslimat tamamlandı
```

### 2. Restoran Akışı

```
1. Yeni Sipariş Oluştur
   ↓
2. Müsait Kurye Seç
   ↓
3. Sipariş ASSIGNED durumuna geçer
   ↓
4. Kurye lokasyonunu canlı izle
   ↓
5. DELIVERED durumu → Ödeme hesaplanır
```

### 3. Kurye Akışı

```
1. Atanan siparişi gör (ASSIGNED)
   ↓
2. "Siparişi Aldım" → PICKED_UP
   ↓
3. GPS lokasyon otomatik paylaşılır
   ↓
4. "Teslim Ettim" → DELIVERED
   ↓
5. Kazancın hesabına eklenir
```

---

## 💰 Finansal Sistem

### Komisyon Oranları
- **Restoran Komisyonu:** %15 (varsayılan)
- **Kurye Ücreti:** Sipariş tutarının %10'u (minimum)

### Hesaplama Örneği

```
Sipariş Tutarı: 100 TL

├─ Restoran'a Giden: 85 TL (100 - %15 komisyon)
├─ Kurye'ye Giden: 10 TL (100 x %10)
└─ Platform Geliri: 5 TL (%15 - %10 = %5)
```

### Finansal Rapor (Restoran)
- Toplam sipariş sayısı
- Toplam kazanç (komisyon düşülmüş)
- Ödenen komisyon
- Sipariş başı ortalama

### Finansal Rapor (Kurye)
- Tamamlanan teslimat sayısı
- Toplam kazanç
- Ortalama kurye ücreti
- Teslimat başı kazanç

---

## 🗺️ GPS Takip Sistemi

### Kurye Tarafı
- **Otomatik Lokasyon Paylaşımı:** Sipariş aldığında başlar
- **Güncelleme Sıklığı:** Her 5 saniyede bir (değiştirilebilir)
- **WebSocket:** Gerçek zamanlı iletişim

### Restoran Tarafı
- **Canlı Harita:** Leaflet.js ile
- **Kurye İkonu:** Motosiklet sembolü
- **Teslimat Noktası:** Kırmızı işaretleyici
- **Otomatik Merkez:** Kurye konumunu takip eder

---

## 🛠️ Teknik Detaylar

### Backend API Endpoints

#### Auth
```
POST /api/auth/register  (Sadece RESTAURANT)
POST /api/auth/login     (Tüm roller)
```

#### Orders
```
GET    /api/orders               (Restoran: kendi siparişleri, Kurye: atanan siparişler)
POST   /api/orders               (Restoran)
PATCH  /api/orders/:id/assign    (Restoran)
PATCH  /api/orders/:id/status    (Kurye)
```

#### Location
```
POST /api/location/update        (Kurye - GPS)
GET  /api/location/:courierId    (Restoran - Tracking)
```

#### Financial
```
GET /api/financial/restaurant    (Restoran raporları)
GET /api/financial/courier       (Kurye kazançları)
```

#### Admin (Sadece ADMIN rolü)
```
GET    /api/admin/stats            (Dashboard istatistikleri)
GET    /api/admin/users            (Tüm kullanıcılar)
GET    /api/admin/orders           (Tüm siparişler)
GET    /api/admin/restaurants      (Tüm restoranlar)
GET    /api/admin/couriers         (Tüm kuryeler)
POST   /api/admin/couriers         (Kurye oluştur) ⭐ YENİ
DELETE /api/admin/couriers/:id    (Kurye sil) ⭐ YENİ
PATCH  /api/admin/users/:id/toggle-status  (Kullanıcı aktif/pasif)
GET    /api/admin/logs             (Sistem logları)
```

### Güvenlik
- **JWT Token:** 7 gün geçerli
- **Role-Based Access:** Her endpoint rol kontrolü yapar
- **Password Hash:** bcryptjs ile
- **CORS:** Frontend domain'i whitelisted

---

## 📝 Önemli Notlar

### ✅ Kurye Kaydı Hakkında
- ❌ **Kurye kendi kendine kayıt olamaz**
- ✅ **Sadece admin panelinden oluşturulur**
- 🔑 **Admin şifreyi belirler**
- 📧 **Admin email'i belirler**
- 🏍️ **Admin araç tipini belirler**

### Register Sayfası
- Restoran kaydı: ✅ Açık
- Kurye kaydı: ❌ Devre dışı
- Admin kaydı: ❌ Manuel (database)

### Kurye Giriş Yapabilir
- Admin tarafından oluşturulmuş email ve şifre ile
- Login sayfasından normal şekilde
- Kurye dashboard'una otomatik yönlendirilir

---

## 🐛 Sorun Giderme

### "Kurye kaydı yapamıyorum"
✅ **Normal!** Kurye kaydı admin panelinden yapılır. Register sayfası sadece restoran içindir.

### "Admin olarak kurye oluşturamıyorum"
- ✅ Admin token'ınızın geçerli olduğundan emin olun
- ✅ Tüm alanları doldurduğunuzdan emin olun
- ✅ Email zaten kullanımda olabilir
- ✅ Backend loglarını kontrol edin

### "Oluşturduğum kurye giriş yapamıyor"
- ✅ Email'i doğru yazdığınızdan emin olun
- ✅ Şifreyi doğru girdiğinizden emin olun
- ✅ Backend ve frontend çalışıyor mu kontrol edin

### "Kuryeyi silemiyorum" ⭐ YENİ
- ✅ **Aktif sipariş kontrolü:** Kurye'nin aktif (ASSIGNED veya PICKED_UP) siparişi varsa silinemez
- ✅ Önce tüm siparişlerin tamamlanmasını bekleyin (DELIVERED durumuna geçmesini)
- ✅ Admin yetkisine sahip olduğunuzdan emin olun
- ✅ Hata mesajını dikkatle okuyun

### "Kurye listesi açılmıyor"
- ✅ Backend'in çalıştığından emin olun
- ✅ Admin olarak giriş yaptığınızdan emin olun
- ✅ Browser console'da hata var mı kontrol edin

---

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Backend loglarını kontrol edin (terminal)
2. Browser console'u kontrol edin (F12)
3. Network sekmesinde API çağrılarını inceleyin

---

**✨ Sistem kullanıma hazır!**

Test etmek için:
1. Admin olarak giriş yapın: http://localhost:3000/login
2. Yeni kurye oluşturun
3. Kurye ile giriş yapın
4. Sistemin tüm özelliklerini test edin!
