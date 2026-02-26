import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getDashboardStats,
  getAllUsers,
  getAllOrders,
  getAllRestaurants,
  getAllCouriers,
  getCourierPerformanceReport,
  toggleUserStatus,
  getSystemLogs,
  createCourier,
  updateCourier,
  deleteCourier,
  createRestaurant,
  deleteRestaurant,
  getRestaurantFinancialReport,
  updateRestaurantCommission,
  getSystemSettings,
  updateSystemSettings,
  getCourierSettlementClosings
} from '../controllers/admin.controller';

const router = Router();

// Tüm admin rotaları için authentication ve authorization gerekli
router.use(authenticate);
router.use(authorize('ADMIN'));

// Dashboard istatistikleri
router.get('/stats', getDashboardStats);

// Kullanıcı yönetimi
router.get('/users', getAllUsers);
router.patch('/users/:userId/toggle-status', toggleUserStatus);

// Sipariş yönetimi
router.get('/orders', getAllOrders);

// Restoran yönetimi
router.get('/restaurants', getAllRestaurants);
router.post('/restaurants', createRestaurant);
router.delete('/restaurants/:restaurantId', deleteRestaurant);
router.get('/restaurants/:restaurantId/financial-report', getRestaurantFinancialReport);
router.patch('/restaurants/:restaurantId/commission', updateRestaurantCommission);

// Kurye yönetimi
router.get('/couriers', getAllCouriers);
router.get('/couriers/:courierId/performance', getCourierPerformanceReport);
router.get('/couriers/settlements/closings', getCourierSettlementClosings);
router.post('/couriers', createCourier);
router.patch('/couriers/:courierId', updateCourier);
router.delete('/couriers/:courierId', deleteCourier);

// Sistem logları
router.get('/logs', getSystemLogs);

// Sistem ayarları
router.get('/settings', getSystemSettings);
router.patch('/settings', updateSystemSettings);

export default router;
