import { Router } from 'express';
import {
  getRestaurantFinancials,
  getCourierEarnings,
  getDailyReport,
  getMonthlyReport,
  getCourierDailySettlement,
  closeCourierDailySettlement
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

// Kurye günlük restoran bazlı hesap özeti
router.get('/courier/settlement', authorize('COURIER', 'ADMIN'), getCourierDailySettlement);

// Kurye günlük hesap kapama
router.post('/courier/settlement/close', authorize('COURIER', 'ADMIN'), closeCourierDailySettlement);

export default router;
