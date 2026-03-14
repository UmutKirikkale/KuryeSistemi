import { api } from './api';

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
}

export interface OCRResponse {
  message: string;
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
  };
}

export const ocrService = {
  extractOrderFromImage: async (imageUri: string, fileName?: string, mimeType?: string) => {
    const formData = new FormData();

    formData.append('orderImage', {
      uri: imageUri,
      name: fileName || `order-${Date.now()}.jpg`,
      type: mimeType || 'image/jpeg'
    } as any);

    const response = await api.post<OCRResponse>('/ocr/extract-order', formData, {
      headers: {
        'Content-Type': undefined
      },
      timeout: 60000
    });

    return response.data;
  }
};
