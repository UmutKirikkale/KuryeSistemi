import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';

export const seedDemoUsers = async (): Promise<void> => {
  const hashedPassword = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true
    },
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true
    }
  });

  const restaurantUser = await prisma.user.upsert({
    where: { email: 'restaurant@test.com' },
    update: {
      password: hashedPassword,
      name: 'Test Restaurant',
      role: 'RESTAURANT',
      isActive: true
    },
    create: {
      email: 'restaurant@test.com',
      password: hashedPassword,
      name: 'Test Restaurant',
      role: 'RESTAURANT',
      isActive: true
    }
  });

  const courierUser = await prisma.user.upsert({
    where: { email: 'courier@test.com' },
    update: {
      password: hashedPassword,
      name: 'Test Courier',
      role: 'COURIER',
      isActive: true
    },
    create: {
      email: 'courier@test.com',
      password: hashedPassword,
      name: 'Test Courier',
      role: 'COURIER',
      isActive: true
    }
  });

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
};
