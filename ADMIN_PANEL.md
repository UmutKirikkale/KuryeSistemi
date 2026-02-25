# 👑 Yönetici Paneli - Kullanım Kılavuzu

## ✅ Kurulum Tamamlandı!

Yönetici paneli başarıyla sisteme entegre edildi.

## 🎯 Admin Giriş Bilgileri

### 👑 YÖNETİCİ (ADMIN):
- **Email:** `admin@test.com`
- **Şifre:** `123456`
- **Panel:** Yönetici Dashboard

### 🍕 RESTORAN:
- **Email:** `restoran@test.com`
- **Şifre:** `123456`
- **Panel:** Restoran Dashboard

### 🏍️ KURYE:
- **Email:** `kurye@test.com`
- **Şifre:** `123456`
- **Panel:** Kurye Dashboard

---

## 📊 Admin Dashboard Özellikleri

### 1. **Genel İstatistikler**
- Toplam kullanıcı sayısı
- Toplam sipariş sayısı
- Aktif ve tamamlanan siparişler
- Toplam gelir ve bugünkü gelir
- Restoran ve kurye sayıları

### 2. **Kurye Yönetimi** ⭐ YENİ
- **Kurye Oluşturma:** "Ekle" butonu ile kurye oluşturma
- **Kurye Listesi:** "Liste" butonu ile tüm kuryeleri görüntüleme
- **Kurye Silme:** Liste ekranında her kurye için "Sil" butonu
- Kurye bilgilerini belirleme (email, şifre, ad, telefon, araç tipi)
- ⚠️ **Önemli:** Kuryeler sadece admin tarafından oluşturulur ve silinir
- Kuryeler admin'in belirlediği email ve şifre ile giriş yapar
- 🔒 **Güvenlik:** Aktif siparişi olan kuryeler silinemez

### 3. **Kullanıcı Yönetimi** (Geliştiriliyor)
- Tüm kullanıcıları görüntüleme
- Kullanıcı durumunu aktif/pasif yapma
- Rol bazlı filtreleme

### 4. **Sipariş Yönetimi** (Geliştiriliyor)
- Tüm siparişleri görüntüleme
- Durum bazlı filtreleme
- Sipariş detayları

### 5. **Restoran Yönetimi** (Geliştiriliyor)
- Tüm restoranları listeleme
- Restoran istatistikleri
- Komisyon oranları

### 6. **Sistem Durumu**
- Backend durumu
- Database durumu
- WebSocket durumu

---

## 🚀 Giriş Yapma

1. **Tarayıcıda aç:** http://localhost:3000

2. **Admin bilgileriyle giriş yap:**
   - Email: `admin@test.com`
   - Şifre: `123456`

3. **Yönetici paneline yönlendirileceksiniz**

---

## 🏍️ Kurye Oluşturma Rehberi

### Adım 1: Admin Dashboard'a Gir
- http://localhost:3000 adresine git
- Admin hesabı ile giriş yap (`admin@test.com` / `123456`)

### Adım 2: Kurye Oluştur
1. Dashboard'da **"Kuryeler"** kartını bul
2. **"Ekle"** butonuna tıkla
3. Açılan formda bilgileri gir:
   - **Ad Soyad:** Kurye'nin tam adı
   - **E-posta:** Giriş için kullanacağı email (benzersiz olmalı)
   - **Şifre:** Kurye'nin giriş şifresi (unutmayın!)
   - **Telefon:** İletişim numarası
   - **Araç Tipi:** Bisiklet, Motosiklet veya Araba

4. **"Oluştur"** butonuna tıkla

### Adım 3: Kurye Listesini Görüntüle ve Yönet
1. Dashboard'da **"Kuryeler"** kartında **"Liste"** butonuna tıkla
2. Tüm kuryeleri görebilirsiniz:
   - Ad, email, telefon bilgileri
   - Araç tipi
   - Müsaitlik durumu (Müsait/Meşgul)
   - Her kurye için **"Sil"** butonu

### Kurye Silme
1. **"Liste"** butonuna tıkla
2. Silmek istediğiniz kuryenin yanındaki **"Sil"** butonuna tıkla
3. Onay penceresinde **"Tamam"**'a tıkla
4. ✅ Kurye başarıyla silinir

⚠️ **Önemli:** Aktif siparişi olan kuryeler silinemez. Önce siparişlerin tamamlanması gerekir.

### Adım 3: Kurye'ye Bilgileri Ver
✅ Kurye hesabı oluşturulduktan sonra:
- Email ve şifreyi kurye ile paylaş
- Kurye http://localhost:3000/login adresinden giriş yapabilir
- Kurye Dashboard'una otomatik yönlendirilir

### Örnek Senaryo

**Admin oluşturur:**
```
Email: ali@kurye.com
Şifre: ali123456
Ad: Ali Kural
Telefon: 05551234567
Araç: Motosiklet
```

**Kurye giriş yapar:**
```
http://localhost:3000/login
Email: ali@kurye.com
Şifre: ali123456
→ Kurye Dashboard açılır
```

---

## 🔧 Backend API Endpoint'leri

### Admin Routes (Sadece Admin Erişimi)

```bash
# Dashboard İstatistikleri
GET /api/admin/stats

# Tüm Kullanıcılar
GET /api/admin/users?page=1&limit=20&role=ALL

# Kullanıcı Durumu Değiştir
PATCH /api/admin/users/:userId/toggle-status

# Tüm Siparişler
GET /api/admin/orders?page=1&limit=20&status=ALL

# Tüm Restoranlar
GET /api/admin/restaurants

# Tüm Kuryeler
GET /api/admin/couriers

# Kurye Oluştur ⭐ YENİ
POST /api/admin/couriers
Body: {
  "email": "yeni@kurye.com",
  "password": "sifre123",
  "name": "Yeni Kurye",
  "phone": "05551234567",
  "vehicleType": "Motosiklet"
}

# Kurye Sil ⭐ YENİ
DELETE /api/admin/couriers/:courierId
# Not: Aktif siparişi olan kuryeler silinemez

# Sistem Logları
GET /api/admin/logs?limit=50
```

### Authorization Header:
```
Authorization: Bearer {JWT_TOKEN}
```

---

## 📝 Test Kullanıcılarını Yeniden Oluşturma

Eğer database'i sıfırladıysanız:

```bash
cd /Users/umutkirikkale/Desktop/KuryeSistemi
./test-register.sh
```

Bu script şu kullanıcıları oluşturur:
- 👑 Admin
- 🍕 Restoran
- 🏍️ Kurye

---

## 🎨 Dashboard Özellikleri

### Üst Kısım (Stats Cards)
- **Toplam Kullanıcı:** Sistem genelindeki tüm kullanıcılar
- **Toplam Sipariş:** Tüm siparişler (aktif + tamamlandı)
- **Toplam Gelir:** Tamamlanan siparişlerden toplam gelir
- **Aktif Siparişler:** Devam eden teslimatlar

### Orta Kısım
- **Restoranlar:** Kayıtlı restoran sayısı
- **Kuryeler:** Aktif kurye sayısı
- **Teslim Oranı:** Başarılı teslimat yüzdesi

### Alt Kısım
- **Son Kayıt Olan Kullanıcılar:** En son 5 kullanıcı
- **Son Siparişler:** En son 5 sipariş

### En Alt (Sistem Durumu)
- Backend, Database ve WebSocket durumu
- Tüm servisler online olmalı

---

## 🔐 Güvenlik

- Tüm admin endpoint'leri JWT token ile korunuyor
- Sadece ADMIN rolüne sahip kullanıcılar erişebilir
- Yetkisiz erişim denemeleri 403 Forbidden döner

---

## 🛠️ Geliştirme Notları

### Tamamlanan Özellikler:
- [x] Admin dashboard ve istatistikler
- [x] **Kurye oluşturma sistemi** ⭐
- [x] **Kurye silme sistemi** ⭐ YENİ
- [x] **Kurye listesi modal'ı** ⭐ YENİ
- [x] Kurye kayıt yetkisi kaldırıldı (sadece admin)
- [x] Aktif sipariş kontrolü (silmeden önce)
- [x] Tüm kullanıcıları listeleme
- [x] Tüm siparişleri listeleme
- [x] Sistem durumu gösterimi

### Gelecek Özellikler:
- [ ] Kullanıcı düzenleme formu
- [ ] Kurye düzenleme/silme
- [ ] Sipariş detay modal'ı
- [ ] Finansal raporlar (grafik)
- [ ] Gerçek zamanlı bildirimler
- [ ] Export/PDF özelliği
- [ ] Filtreleme ve arama
- [ ] Pagination (sayfalama)

### Teknik Detaylar:
- **Frontend:** React + TypeScript + Tailwind CSS
- **State Management:** Zustand
- **API Calls:** Axios
- **Icons:** Lucide React
- **Backend:** Node.js + Express + Prisma
- **Auth:** JWT + bcryptjs

---

## ❓ Sorun Giderme

### "Access denied" hatası alıyorum
→ Admin rolü ile giriş yaptığınızdan emin olun

### İstatistikler yüklenmiyor
→ Backend'in çalıştığından emin olun: http://localhost:5001/api/health

### Dashboard boş görünüyor
→ Test kullanıcılarını oluşturun: `./test-register.sh`

---

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Backend loglara bakın
2. Browser console'u kontrol edin (F12)
3. Network sekmesinde API isteklerini inceleyin

---

**✨ Yönetici paneli kullanıma hazır!**
