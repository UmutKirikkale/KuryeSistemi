import dotenv from 'dotenv';
import path from 'path';
import { prisma } from '../config/database';
import { seedDemoUsers } from '../utils/seedDemoUsers';

dotenv.config({
  path: path.resolve(__dirname, '../../.env')
});

const run = async () => {
  try {
    await seedDemoUsers();
    console.log('✅ Demo users seeded successfully');
  } catch (error) {
    console.error('❌ Failed to seed demo users:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

run();
