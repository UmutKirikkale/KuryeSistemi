import { Router } from 'express';
import {
  listMarketplaceRestaurants,
  getMarketplaceRestaurantMenu,
  createMarketplaceOrder,
  getMarketplaceOrderStatus,
  getMarketplaceOrderRating,
  submitMarketplaceOrderRating
} from '../controllers/marketplace.controller';
import { authenticateCustomer } from '../middleware/auth';

const router = Router();

router.get('/restaurants', listMarketplaceRestaurants);
router.get('/restaurants/:restaurantId/menu', getMarketplaceRestaurantMenu);
router.post('/orders', authenticateCustomer, createMarketplaceOrder);
router.get('/orders/:orderNumber', getMarketplaceOrderStatus);
router.get('/orders/:orderNumber/rating', authenticateCustomer, getMarketplaceOrderRating);
router.post('/orders/:orderNumber/rating', authenticateCustomer, submitMarketplaceOrderRating);

export default router;
