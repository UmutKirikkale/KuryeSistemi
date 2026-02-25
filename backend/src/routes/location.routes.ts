import { Router } from 'express';
import {
  updateCourierLocation,
  getCourierLocations,
  getCourierLocationHistory,
  toggleCourierAvailability,
  reverseGeocode
} from '../controllers/location.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Reverse geocoding endpoint - authentication gerektirmez (public)
router.get('/reverse-geocode', reverseGeocode);

// Tüm route'lar authentication gerektirir
router.use(authenticate);

// Kurye konum güncelleme
router.post('/update', authorize('COURIER'), updateCourierLocation);

// Kurye müsaitlik durumu değiştirme
router.post('/toggle-availability', authorize('COURIER'), toggleCourierAvailability);

// Tüm kurye konumlarını görüntüleme (restoran ve admin)
router.get('/couriers', authorize('RESTAURANT', 'ADMIN'), getCourierLocations);

// Kurye konum geçmişi
router.get('/history/:courierId', getCourierLocationHistory);

export default router;
