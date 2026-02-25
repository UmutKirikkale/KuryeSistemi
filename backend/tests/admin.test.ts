import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app';
import { beforeAll, afterAll, describe, it, expect } from '@jest/globals';

const prisma = new PrismaClient();
const app = createApp();

const adminEmail = 'admin@test.com';
const adminPassword = '123456';

const resetDatabase = async () => {
  await prisma.order.deleteMany();
  await prisma.financialTransaction.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.courierProfile.deleteMany();
  await prisma.user.deleteMany();
};

const loginAsAdmin = async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: adminEmail, password: adminPassword });

  return res.body.token as string;
};

beforeAll(async () => {
  await resetDatabase();

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN'
    }
  });

  const restaurantOwner = await prisma.user.create({
    data: {
      email: 'restoran@test.com',
      password: hashedPassword,
      name: 'Restaurant Owner',
      role: 'RESTAURANT'
    }
  });

  await prisma.restaurant.create({
    data: {
      userId: restaurantOwner.id,
      name: 'Test Restaurant',
      address: 'Test Address',
      phone: '05000000000',
      commissionPerOrder: 150
    }
  });

  expect(admin.id).toBeDefined();
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('Admin Restaurants', () => {
  it('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/admin/restaurants');
    expect(res.status).toBe(401);
  });

  it('returns restaurant list for admin', async () => {
    const token = await loginAsAdmin();

    const res = await request(app)
      .get('/api/admin/restaurants')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.restaurants[0].commissionPerOrder).toBe(150);
    expect(res.body.restaurants[0].user.email).toBe('restoran@test.com');
  });
});
