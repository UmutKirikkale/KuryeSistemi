# 3 Panel Mobil Gecis Plani

## Hedef

Tek mobil uygulamada role gore 3 paneli acmak:

- COURIER
- RESTAURANT
- ADMIN

## Tamamlanan Adim 1

- Expo tabanli mobil proje iskeleti eklendi.
- Login akisi eklendi.
- JWT token AsyncStorage ile saklaniyor.
- Role gore panel secimi aktif.
- 3 panel icin ayri ekranlar olusturuldu.

## Adim 2 - Ortak Altyapi (Sonraki)

- React Navigation kurulumu
- Bottom tabs ve stack yapisi
- Ortak tema ve UI component seti
- Merkezi hata ve loading yonetimi

## Adim 3 - Kurye Paneli

- Siparis listesi
- Siparis alma / durum guncelleme
- Arka plan GPS (native module, foreground service)
- Kurye gunluk settlement ekrani

## Adim 4 - Restoran Paneli

- Siparis olusturma
- Siparis listesi ve durum takibi
- Kurye harita ekrani
- Finansal ozet ekrani

## Adim 5 - Admin Paneli

- Dashboard stats
- Kullanici, kurye, restoran yonetimi
- Komisyon ve sistem ayarlari
- Log ve rapor ekranlari

## Adim 6 - Test ve Dagitim

- TestFlight / Google Internal Test
- Pilot kullanici grubu
- Crash raporlama (Sentry)
- Performance izleme

## Teknik Not

Web kapansa da GPS surekliligi icin kurye panelinde native arka plan servisleri zorunludur.
