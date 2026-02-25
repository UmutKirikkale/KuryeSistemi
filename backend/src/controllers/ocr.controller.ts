import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ocrService } from '../services/ocr.service';

export const extractOrderFromImage = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Sadece restoran siparişi OCR ile oluşturabilir
    if (req.userRole !== 'RESTAURANT') {
      throw new AppError('Only restaurants can use OCR order extraction', 403);
    }

    // Dosya yüklendi mi kontrol et
    if (!req.file) {
      throw new AppError('No image file uploaded', 400);
    }

    console.log('Processing image:', req.file.filename);

    // OCR ile sipariş bilgilerini çıkar
    const extractedData = await ocrService.processOrderImage(req.file.path);

    res.json({
      message: 'Order data extracted successfully',
      data: extractedData,
      suggestions: {
        customerName: extractedData.customerName || '',
        customerPhone: extractedData.customerPhone || '',
        deliveryAddress: extractedData.deliveryAddress || '',
        pickupAddress: extractedData.pickupAddress || '',
        orderAmount: extractedData.orderAmount || 0,
        subtotalAmount: extractedData.subtotalAmount || 0,
        discountAmount: extractedData.discountAmount || 0,
        payableAmount: extractedData.payableAmount || extractedData.orderAmount || 0,
        items: extractedData.items || [],
        notes: extractedData.notes || '',
        confidence: extractedData.confidence,
        quality: extractedData.quality,
        missingFields: extractedData.missingFields || []
      }
    });
  } catch (error: unknown) {
    console.error('OCR extraction error:', error);

    if (error instanceof AppError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Failed to extract order data from image';
    throw new AppError(message, 500);
  }
};
