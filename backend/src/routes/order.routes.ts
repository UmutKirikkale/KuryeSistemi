import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  assignOrder,
  updateOrderStatus
} from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// Sipariş oluşturma (sadece restoran)
router.post('/', authorize('RESTAURANT'), createOrder);

// Siparişleri listeleme
router.get('/', getOrders);

// Tek sipariş detayı
router.get('/:id', getOrderById);

// Sipariş atama (sadece kurye)
router.post('/:id/assign', authorize('COURIER'), assignOrder);

// Sipariş durumu güncelleme
router.patch('/:id/status', updateOrderStatus);

export default router;
