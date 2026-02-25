import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../config/multer';
import { extractOrderFromImage } from '../controllers/ocr.controller';

const router = Router();

// OCR ile sipariş çıkarma (sadece restaurant)
router.post(
  '/extract-order',
  authenticate,
  authorize('RESTAURANT'),
  upload.single('orderImage'),
  extractOrderFromImage
);

export default router;
