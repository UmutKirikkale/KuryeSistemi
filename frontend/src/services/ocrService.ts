import api from './api';

export interface ExtractedOrderData {
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  pickupAddress?: string;
  orderAmount?: number;
  subtotalAmount?: number;
  discountAmount?: number;
  payableAmount?: number;
  items?: string[];
  notes?: string;
  rawText: string;
  confidence: number;
  quality?: 'LOW' | 'MEDIUM' | 'HIGH';
  missingFields?: string[];
  extractionSource?: 'AI' | 'OCR';
  recommendedManualReview?: boolean;
  manualReviewReasons?: string[];
  debug?: {
    aiAttempted: boolean;
    aiAccepted: boolean;
    aiRejectedReason?: string;
    selectedSource: 'AI' | 'OCR';
    selectedVariant: string;
    candidates: Array<{
      source: 'AI' | 'OCR';
      variant: string;
      confidence: number;
      score: number;
      quality: 'LOW' | 'MEDIUM' | 'HIGH';
      missingFields: string[];
    }>;
  };
}

export interface OCRResponse {
  message: string;
  extractionSource?: 'AI' | 'OCR';
  recommendedManualReview?: boolean;
  manualReviewReasons?: string[];
  debug?: ExtractedOrderData['debug'];
  data: ExtractedOrderData;
  suggestions: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    pickupAddress: string;
    orderAmount: number;
    subtotalAmount?: number;
    discountAmount?: number;
    payableAmount?: number;
    items: string[];
    notes: string;
    confidence: number;
    quality?: 'LOW' | 'MEDIUM' | 'HIGH';
    missingFields?: string[];
    extractionSource?: 'AI' | 'OCR';
    recommendedManualReview?: boolean;
    manualReviewReasons?: string[];
    debug?: ExtractedOrderData['debug'];
  };
}

class OCRService {
  async extractOrderFromImage(file: File): Promise<OCRResponse> {
    const formData = new FormData();
    formData.append('orderImage', file);

    const response = await api.post<OCRResponse>('/ocr/extract-order', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
}

export const ocrService = new OCRService();
