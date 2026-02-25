import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  updateRestaurantLocation,
  getRestaurantProfile,
  getRestaurantCourierLocations,
  getRestaurantMenu,
  createRestaurantMenuCategory,
  updateRestaurantMenuCategory,
  deleteRestaurantMenuCategory,
  createRestaurantMenuItem,
  updateRestaurantMenuItem,
  deleteRestaurantMenuItem
} from '../controllers/restaurant.controller';

const router = Router();

// Tüm restaurant rotaları için authentication ve authorization gerekli
router.use(authenticate);
router.use(authorize('RESTAURANT'));

// Restoran profili
router.get('/profile', getRestaurantProfile);

// Restoran konumu güncelleme
router.patch('/location', updateRestaurantLocation);

// Restoran kuryelerinin konumları
router.get('/courier-locations', getRestaurantCourierLocations);

// Restoran menü yönetimi
router.get('/menu', getRestaurantMenu);
router.post('/menu/categories', createRestaurantMenuCategory);
router.patch('/menu/categories/:categoryId', updateRestaurantMenuCategory);
router.delete('/menu/categories/:categoryId', deleteRestaurantMenuCategory);
router.post('/menu/items', createRestaurantMenuItem);
router.patch('/menu/items/:itemId', updateRestaurantMenuItem);
router.delete('/menu/items/:itemId', deleteRestaurantMenuItem);

export default router;
