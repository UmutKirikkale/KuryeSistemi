import 'express-async-errors';
import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth.routes';
import orderRoutes from './routes/order.routes';
import locationRoutes from './routes/location.routes';
import financialRoutes from './routes/financial.routes';
import adminRoutes from './routes/admin.routes';
import restaurantRoutes from './routes/restaurant.routes';
import ocrRoutes from './routes/ocr.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import customerRoutes from './routes/customer.routes';
import { errorHandler } from './middleware/errorHandler';

export const createApp = (): Application => {
  const app: Application = express();

  // CORS ayarları - daha kapsamlı
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600 // Preflight cache 10 dakika
  }));

  // Preflight request'leri handle et
  app.options('*', cors());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static files - uploads klasörü
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  app.use('/api/auth', authRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/location', locationRoutes);
  app.use('/api/financial', financialRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/restaurant', restaurantRoutes);
  app.use('/api/ocr', ocrRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/customer', customerRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  app.use(errorHandler);

  return app;
};
