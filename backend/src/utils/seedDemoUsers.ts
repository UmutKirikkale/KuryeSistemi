import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';

export const seedDemoUsers = async (): Promise<void> => {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const upsertUser = async (
    email: string,
    name: string,
    role: 'ADMIN' | 'RESTAURANT' | 'COURIER'
  ) => {
    return prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        name,
        role,
        isActive: true
      },
      create: {
        email,
        password: hashedPassword,
        name,
        role,
        isActive: true
      }
    });
  };

  await upsertUser('admin@test.com', 'Admin User', 'ADMIN');

  const restaurantUsers = await Promise.all([
    upsertUser('restaurant@test.com', 'Test Restaurant', 'RESTAURANT'),
    upsertUser('restoran@test.com', 'Test Restoran', 'RESTAURANT')
  ]);

  const courierUsers = await Promise.all([
    upsertUser('courier@test.com', 'Test Courier', 'COURIER'),
    upsertUser('kurye@test.com', 'Test Kurye', 'COURIER')
  ]);

  for (const restaurantUser of restaurantUsers) {
    const restaurantProfile = await prisma.restaurant.findFirst({
      where: { userId: restaurantUser.id }
    });

    if (!restaurantProfile) {
      await prisma.restaurant.create({
        data: {
          userId: restaurantUser.id,
          name: 'Pizza Palace',
          address: 'Kadıköy, İstanbul',
          phone: '02161234567',
          commissionPerOrder: 100
        }
      });
    }
  }

  for (const courierUser of courierUsers) {
    const courierProfile = await prisma.courierProfile.findUnique({
      where: { userId: courierUser.id }
    });

    if (!courierProfile) {
      await prisma.courierProfile.create({
        data: {
          userId: courierUser.id,
          vehicleType: 'MOTORCYCLE',
          isAvailable: true
        }
      });
    }
  }
};
