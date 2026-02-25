#!/bin/bash

echo "👑 ADMIN kullanıcısı oluşturuluyor..."
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "123456",
    "name": "Sistem Yöneticisi",
    "phone": "05551111111",
    "role": "ADMIN"
  }' | jq '.'

echo ""
echo "🍕 RESTORAN kullanıcısı oluşturuluyor..."
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "restoran@test.com",
    "password": "123456",
    "name": "Pizza Palace",
    "phone": "05551234567",
    "role": "RESTAURANT",
    "restaurantData": {
      "name": "Pizza Palace",
      "address": "Kadıköy, İstanbul",
      "phone": "02161234567",
      "commissionRate": 15
    }
  }' | jq '.'

echo ""
echo "🏍️ KURYE kullanıcısı oluşturuluyor..."
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kurye@test.com",
    "password": "123456",
    "name": "Ahmet Yılmaz",
    "phone": "05559876543",
    "role": "COURIER",
    "courierData": {
      "vehicleType": "Motosiklet"
    }
  }' | jq '.'

echo ""
echo "✅ Kullanıcılar oluşturuldu!"
echo ""
echo "📝 GİRİŞ BİLGİLERİ:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👑 ADMIN:"
echo "   Email: admin@test.com"
echo "   Şifre: 123456"
echo ""
echo "🍕 RESTORAN:"
echo "   Email: restoran@test.com"
echo "   Şifre: 123456"
echo ""
echo "🏍️ KURYE:"
echo "   Email: kurye@test.com"
echo "   Şifre: 123456"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Frontend: http://localhost:3000"
