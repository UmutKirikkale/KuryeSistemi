import { Router } from 'express';
import {
  getRestaurantFinancials,
  getCourierEarnings,
  getDailyReport,
  getMonthlyReport
} from '../controllers/financial.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// Restoran finansal özeti
router.get('/restaurant', authorize('RESTAURANT', 'ADMIN'), getRestaurantFinancials);

// Kurye kazançları
router.get('/courier', authorize('COURIER', 'ADMIN'), getCourierEarnings);

// Günlük rapor
router.get('/daily', getDailyReport);

// Aylık rapor
router.get('/monthly', getMonthlyReport);

export default router;
