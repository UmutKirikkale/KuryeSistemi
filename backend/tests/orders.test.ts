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
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('Orders', () => {
  it('prevents couriers from creating orders', async () => {
    const courierToken = await login('kurye@test.com', password);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${courierToken}`)
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

    expect(res.status).toBe(403);
  });

  it('creates, assigns, and delivers an order', async () => {
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

    expect(createRes.status).toBe(201);
    expect(createRes.body.order.commissionAmount).toBe(150);

    const orderId = createRes.body.order.id as string;

    const assignRes = await request(app)
      .post(`/api/orders/${orderId}/assign`)
      .set('Authorization', `Bearer ${courierToken}`)
      .send();

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.order.status).toBe('ASSIGNED');

    const deliverRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${courierToken}`)
      .send({ status: 'DELIVERED', paymentMethod: 'CARD' });

    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.order.status).toBe('DELIVERED');
  });
});
