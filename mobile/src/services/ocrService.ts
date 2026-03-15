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
  extractionSource?: 'AI' | 'OCR';
}

export interface OCRResponse {
  message: string;
  extractionSource?: 'AI' | 'OCR';
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
    extractionSource?: 'AI' | 'OCR';
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

    const baseURL = (api.defaults.baseURL || '').replace(/\/+$/, '');
    const authHeader = (api.defaults.headers.common as Record<string, string> | undefined)?.Authorization;

    const response = await fetch(`${baseURL}/ocr/extract-order`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body: formData
    });

    const responseText = await response.text();
    let parsed: OCRResponse | { error?: string } | null = null;

    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const errorMessage =
        (parsed as { error?: string } | null)?.error ||
        `OCR istegi basarisiz oldu (${response.status})`;
      throw new Error(errorMessage);
    }

    return parsed as OCRResponse;
  }
};
