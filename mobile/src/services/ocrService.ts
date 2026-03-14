import { api } from './api';

export interface ExtractedOrderData {
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  pickupAddress?: string;
  orderAmount?: number;
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

    const normalizedType = mimeType && mimeType.startsWith('image/')
      ? mimeType
      : 'image/jpeg';

    const normalizedName =
      fileName ||
      `order-${Date.now()}.${normalizedType.includes('png') ? 'png' : 'jpg'}`;

    formData.append('orderImage', {
      uri: imageUri,
      name: normalizedName,
      type: normalizedType
    } as any);

    const response = await api.post<OCRResponse>('/ocr/extract-order', formData, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'multipart/form-data'
      },
      timeout: 120000
    });

    return response.data;
  }
};
