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

beforeAll(async () => {
  await resetDatabase();

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN'
    }
  });
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('Auth', () => {
  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(adminEmail);
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'wrong' });

    expect(res.status).toBe(401);
  }, 10000);
});
