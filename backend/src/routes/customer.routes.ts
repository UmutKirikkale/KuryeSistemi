import { Router } from 'express';
import {
  customerRegister,
  customerLogin,
  getCustomerProfile,
  createSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  getCustomerOrders
} from '../controllers/customer.controller';
import { authenticateCustomer } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', customerRegister);
router.post('/login', customerLogin);

// Protected routes
router.get('/profile', authenticateCustomer, getCustomerProfile);
router.get('/orders', authenticateCustomer, getCustomerOrders);
router.post('/addresses', authenticateCustomer, createSavedAddress);
router.put('/addresses/:addressId', authenticateCustomer, updateSavedAddress);
router.delete('/addresses/:addressId', authenticateCustomer, deleteSavedAddress);

export default router;
