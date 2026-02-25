import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app';

const prisma = new PrismaClient();
const app = createApp();

const password = '123456';

const resetDatabase = async () => {
  await prisma.financialTransaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.courierProfile.deleteMany();
  await prisma.user.deleteMany();
};

const login = async (email: string, pwd: string) => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: pwd });
  return res.body.token as string;
};

const createDeliveredOrder = async () => {
  const restaurantToken = await login('restoran@test.com', password);
  const courierToken = await login('kurye@test.com', password);

  const createRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${restaurantToken}`)
    .send({
      pickupAddress: 'A',
      deliveryAddress: 'B',
      pickupLatitude: 40.0,
      pickupLongitude: 29.0,
      deliveryLatitude: 40.1,
      deliveryLongitude: 29.1,
      orderAmount: 500,
      courierFee: 80,
      customerName: 'Musteri',
      customerPhone: '05550000000'
    });

  const orderId = createRes.body.order.id as string;

  await request(app)
    .post(`/api/orders/${orderId}/assign`)
    .set('Authorization', `Bearer ${courierToken}`)
    .send();

  await request(app)
    .patch(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${courierToken}`)
    .send({ status: 'DELIVERED', paymentMethod: 'CASH' });
};

beforeAll(async () => {
  await resetDatabase();

  const hashed = await bcrypt.hash(password, 10);

  const restaurantUser = await prisma.user.create({
    data: {
      email: 'restoran@test.com',
      password: hashed,
      name: 'Restaurant Owner',
      role: 'RESTAURANT'
    }
  });

  await prisma.restaurant.create({
    data: {
      userId: restaurantUser.id,
      name: 'Test Restaurant',
      address: 'Test Address',
      phone: '05000000000',
      commissionPerOrder: 150
    }
  });

  const courierUser = await prisma.user.create({
    data: {
      email: 'kurye@test.com',
      password: hashed,
      name: 'Courier',
      role: 'COURIER'
    }
  });

  await prisma.courierProfile.create({
    data: {
      userId: courierUser.id,
      vehicleType: 'Motor'
    }
  });

  await createDeliveredOrder();
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('Financial', () => {
  it('returns restaurant financial summary', async () => {
    const restaurantToken = await login('restoran@test.com', password);

    const res = await request(app)
      .get('/api/financial/restaurant')
      .set('Authorization', `Bearer ${restaurantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.transactionCount).toBe(3);
    expect(res.body.summary.totalEarnings).toBe(500);
    expect(res.body.summary.totalCourierFees).toBe(80);
    expect(res.body.summary.totalCommissions).toBe(150);
  });

  it('returns courier earnings', async () => {
    const courierToken = await login('kurye@test.com', password);

    const res = await request(app)
      .get('/api/financial/courier')
      .set('Authorization', `Bearer ${courierToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.totalOrders).toBe(1);
    expect(res.body.summary.totalEarnings).toBe(80);
  });
});
