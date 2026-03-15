import Tesseract from 'tesseract.js';
import fs from 'fs';
import sharp from 'sharp';

interface ExtractedOrderData {
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
  quality: 'LOW' | 'MEDIUM' | 'HIGH';
  missingFields: string[];
  extractionSource?: 'AI' | 'OCR';
  recommendedManualReview?: boolean;
  manualReviewReasons?: string[];
  debug?: OCRDebugInfo;
}

interface OCRDebugCandidate {
  source: 'AI' | 'OCR';
  variant: string;
  confidence: number;
  score: number;
  quality: 'LOW' | 'MEDIUM' | 'HIGH';
  missingFields: string[];
}

interface OCRDebugInfo {
  aiAttempted: boolean;
  aiAccepted: boolean;
  aiRejectedReason?: string;
  selectedSource: 'AI' | 'OCR';
  selectedVariant: string;
  candidates: OCRDebugCandidate[];
}

interface OCRImageVariant {
  name: string;
  input: string | Buffer;
}

export class OCRService {
  private readonly stopWords = [
    'toplam',
    'total',
    'tutar',
    'ara toplam',
    'musteri',
    'müşteri',
    'telefon',
    'tel',
    'adres',
    'not',
    'note',
    'teslimat',
    'odeme',
    'ödeme'
  ];

  private readonly aiConfig = {
    apiUrl: process.env.AI_OCR_API_URL || process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: process.env.AI_OCR_API_KEY || process.env.OPENROUTER_API_KEY || '',
    model: process.env.AI_OCR_MODEL || 'google/gemini-2.0-flash-exp:free',
    timeoutMs: Number(process.env.AI_OCR_TIMEOUT_MS || 25000)
  };

  private normalizeText(text: string): string {
    return text
      .replace(/\r/g, '\n')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[|]/g, 'I')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private simplifyTurkish(value: string): string {
    return value
      .toLocaleLowerCase('tr-TR')
      .replace(/[ç]/g, 'c')
      .replace(/[ğ]/g, 'g')
      .replace(/[ıi]/g, 'i')
      .replace(/[ö]/g, 'o')
      .replace(/[ş]/g, 's')
      .replace(/[ü]/g, 'u');
  }

  private normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');

    if (digits.length === 12 && digits.startsWith('90')) {
      return `0${digits.slice(2)}`;
    }

    if (digits.length === 10) {
      return `0${digits}`;
    }

    if (digits.length >= 11) {
      return digits.slice(-11);
    }

    return digits;
  }

  private sanitizeCustomerName(value: string): string {
    return value
      .replace(/(?:\+?90\s*)?(?:\(?0?5\d{2}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2})/g, ' ')
      .replace(/\b(?:[01]?\d|2[0-3])[:.]?[0-5]\d\b/g, ' ')
      .replace(/\b(?:saat|teslim\s*saati)\b/gi, ' ')
      .replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private isLikelyCustomerName(value: string): boolean {
    if (!value) return false;
    if (value.length < 4 || value.length > 55) return false;
    if (this.isAddressLike(value)) return false;
    if (this.hasPhone(value) || this.hasTime(value)) return false;

    const sanitized = this.sanitizeCustomerName(value);
    if (!sanitized) return false;

    const words = sanitized.split(/\s+/).filter((word) => word.length > 1);
    return words.length >= 2;
  }

  private parseAmount(amountText: string): number {
    const cleaned = amountText.replace(/[^\d.,]/g, '');
    const commaCount = (cleaned.match(/,/g) || []).length;
    const dotCount = (cleaned.match(/\./g) || []).length;

    if (commaCount > 0 && dotCount > 0) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }

    if (commaCount > 0) {
      return parseFloat(cleaned.replace(',', '.'));
    }

    return parseFloat(cleaned);
  }

  private getImageMimeType(imagePath: string): string {
    const lower = imagePath.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  }

  private parseJsonFromText(raw: string): Record<string, unknown> | null {
    if (!raw) return null;

    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  private extractAiContent(payload: any): string {
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .join('\n');
    }

    return '';
  }

  private normalizeAiResult(raw: Record<string, unknown>): Partial<ExtractedOrderData> {
    const customerNameRaw = typeof raw.customerName === 'string' ? raw.customerName : '';
    const customerPhoneRaw = typeof raw.customerPhone === 'string' ? raw.customerPhone : '';
    const deliveryAddressRaw = typeof raw.deliveryAddress === 'string' ? raw.deliveryAddress : '';
    const pickupAddressRaw = typeof raw.pickupAddress === 'string' ? raw.pickupAddress : '';
    const notesRaw = typeof raw.notes === 'string' ? raw.notes : '';

    const orderAmountRaw =
      typeof raw.payableAmount === 'number'
        ? raw.payableAmount
        : typeof raw.orderAmount === 'number'
        ? raw.orderAmount
        : typeof raw.orderAmount === 'string'
        ? this.parseAmount(raw.orderAmount)
        : 0;

    const discountAmountRaw =
      typeof raw.discountAmount === 'number'
        ? raw.discountAmount
        : typeof raw.discountAmount === 'string'
        ? this.parseAmount(raw.discountAmount)
        : undefined;

    const payableAmountRaw =
      typeof raw.payableAmount === 'number'
        ? raw.payableAmount
        : typeof raw.payableAmount === 'string'
        ? this.parseAmount(raw.payableAmount)
        : orderAmountRaw;

    const normalized: Partial<ExtractedOrderData> = {
      customerName: this.sanitizeCustomerName(customerNameRaw) || undefined,
      customerPhone: customerPhoneRaw ? this.normalizePhone(customerPhoneRaw) : undefined,
      deliveryAddress: this.sanitizeDeliveryAddress(deliveryAddressRaw) || undefined,
      pickupAddress: pickupAddressRaw?.trim() || undefined,
      orderAmount: Number.isFinite(orderAmountRaw) && orderAmountRaw > 0 ? orderAmountRaw : undefined,
      discountAmount: discountAmountRaw && Number.isFinite(discountAmountRaw) ? discountAmountRaw : undefined,
      payableAmount: Number.isFinite(payableAmountRaw) && payableAmountRaw > 0 ? payableAmountRaw : undefined,
      notes: notesRaw?.trim() || undefined,
      extractionSource: 'AI'
    };

    if (!normalized.orderAmount && normalized.payableAmount) {
      normalized.orderAmount = normalized.payableAmount;
    }

    return normalized;
  }

  private scoreExtractionCandidate(data: Partial<ExtractedOrderData>, confidence: number): number {
    let score = confidence;

    if (data.customerName) score += 18;
    if (data.customerPhone && data.customerPhone.length >= 10) score += 18;
    if (data.deliveryAddress && data.deliveryAddress.length >= 10) score += 22;
    if (data.orderAmount && data.orderAmount > 0) score += 24;
    if (data.discountAmount && data.discountAmount >= 0) score += 4;
    if (data.items && data.items.length > 0) score += Math.min(data.items.length, 3) * 2;

    if (data.customerName && !this.isLikelyCustomerName(data.customerName)) score -= 12;
    if (data.deliveryAddress && data.deliveryAddress.length < 8) score -= 10;
    if (data.orderAmount && data.orderAmount > 100000) score -= 20;

    return score;
  }

  private collectMissingFields(data: Partial<ExtractedOrderData>): string[] {
    return [
      { field: 'customerName', exists: Boolean(data.customerName) },
      { field: 'customerPhone', exists: Boolean(data.customerPhone) },
      { field: 'deliveryAddress', exists: Boolean(data.deliveryAddress) },
      { field: 'orderAmount', exists: Boolean(data.orderAmount && data.orderAmount > 0) }
    ]
      .filter((item) => !item.exists)
      .map((item) => item.field);
  }

  private buildManualReviewReasons(orderData: ExtractedOrderData): string[] {
    const reasons: string[] = [];

    if (orderData.quality === 'LOW') {
      reasons.push('low_quality');
    }

    if (orderData.confidence < 70) {
      reasons.push('low_confidence');
    }

    if (orderData.missingFields.includes('deliveryAddress')) {
      reasons.push('missing_delivery_address');
    }

    if (orderData.missingFields.includes('orderAmount')) {
      reasons.push('missing_order_amount');
    }

    if (!orderData.customerPhone || orderData.customerPhone.length < 10) {
      reasons.push('missing_or_invalid_phone');
    }

    if (orderData.deliveryAddress && orderData.deliveryAddress.length < 12) {
      reasons.push('short_delivery_address');
    }

    if (orderData.orderAmount && orderData.orderAmount > 5000) {
      reasons.push('suspicious_high_amount');
    }

    if (orderData.extractionSource === 'OCR' && orderData.missingFields.length >= 2) {
      reasons.push('ocr_multiple_missing_fields');
    }

    return Array.from(new Set(reasons));
  }

  private finalizeOrderData(orderData: ExtractedOrderData, confidence: number): ExtractedOrderData {
    orderData.confidence = confidence;
    orderData.missingFields = this.collectMissingFields(orderData);
    orderData.quality = this.calculateQuality(confidence, orderData.missingFields.length);
    orderData.manualReviewReasons = this.buildManualReviewReasons(orderData);
    orderData.recommendedManualReview = orderData.manualReviewReasons.length > 0;

    return orderData;
  }

  private evaluateAiCandidate(data: Partial<ExtractedOrderData>): { accepted: boolean; score: number; reason?: string } {
    const score = this.scoreExtractionCandidate(data, 72);

    if (!data.deliveryAddress) {
      return { accepted: false, score, reason: 'missing_delivery_address' };
    }

    if (!data.orderAmount || data.orderAmount <= 0) {
      return { accepted: false, score, reason: 'missing_order_amount' };
    }

    if (score < 95) {
      return { accepted: false, score, reason: 'low_ai_score' };
    }

    return { accepted: true, score };
  }

  private async extractByAI(imagePath: string): Promise<{ data: Partial<ExtractedOrderData> | null; candidate?: OCRDebugCandidate; rejectedReason?: string }> {
    if (!this.aiConfig.apiKey) {
      return { data: null, rejectedReason: 'ai_disabled' };
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    const mimeType = this.getImageMimeType(imagePath);
    const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;

    const prompt = [
      'Bu bir yemek siparisi fisi veya ekran goruntusu.',
      'Asagidaki alanlari sadece JSON olarak dondur:',
      '{"customerName":"","customerPhone":"","deliveryAddress":"","pickupAddress":"","orderAmount":0,"discountAmount":0,"payableAmount":0,"notes":""}',
      'Kurallar:',
      '- Sadece JSON ver, ekstra metin verme.',
      '- Teslimat adresinden telefon/saat bilgisini cikar.',
      '- customerName adres veya telefon olmasin.',
      '- Tutar alaninda odenecek tutari kullan.'
    ].join('\n');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.aiConfig.timeoutMs);

    try {
      const response = await fetch(this.aiConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.aiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: this.aiConfig.model,
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageDataUrl } }
              ]
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        return { data: null, rejectedReason: `ai_http_${response.status}` };
      }

      const payload = await response.json();
      const aiText = this.extractAiContent(payload);
      const parsed = this.parseJsonFromText(aiText);
      if (!parsed) {
        return { data: null, rejectedReason: 'ai_invalid_json' };
      }

      const normalized = this.normalizeAiResult(parsed);
      const evaluation = this.evaluateAiCandidate(normalized);
      const candidate: OCRDebugCandidate = {
        source: 'AI',
        variant: 'ai-json-extraction',
        confidence: 72,
        score: evaluation.score,
        quality: this.calculateQuality(72, this.collectMissingFields(normalized).length),
        missingFields: this.collectMissingFields(normalized)
      };

      if (!evaluation.accepted) {
        return { data: null, candidate, rejectedReason: evaluation.reason };
      }

      return { data: normalized, candidate };
    } catch (error) {
      console.warn('AI OCR failed, fallback to Tesseract OCR:', error);
      return { data: null, rejectedReason: 'ai_request_failed' };
    } finally {
      clearTimeout(timer);
    }
  }

  private hasPhone(value: string): boolean {
    return /(?:\+?90\s*)?(?:\(?0?5\d{2}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2})/.test(value);
  }

  private hasTime(value: string): boolean {
    return /\b(?:[01]?\d|2[0-3])[:.]?[0-5]\d\b/.test(value) || /\b(?:saat|teslim\s*saati)\b/i.test(value);
  }

  private isAddressLike(value: string): boolean {
    return /(mahalle|mah\.|sokak|sk\.|cadde|cd\.|bulvar|blv\.|apartman|apt\.|site|blok|daire|no\s*:?)/i.test(value);
  }

  private sanitizeDeliveryAddress(value: string): string {
    return value
      .replace(/(?:\+?90\s*)?(?:\(?0?5\d{2}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2})/g, ' ')
      .replace(/\b(?:[01]?\d|2[0-3])[:.]?[0-5]\d\b/g, ' ')
      .replace(/\b(?:saat|teslim\s*saati)\b/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/[,-]\s*$/, '')
      .trim();
  }

  private extractAmountFromLine(line: string): number | null {
    const hasCurrency = /(?:₺|tl|lira)/i.test(line);
    const matches = Array.from(line.matchAll(/[\d.,]+/g));

    for (let i = matches.length - 1; i >= 0; i -= 1) {
      const raw = matches[i][0];
      const amount = this.parseAmount(raw);
      if (Number.isNaN(amount) || amount <= 0) continue;

      if (!hasCurrency && !/[.,]\d{1,2}/.test(raw)) {
        continue;
      }

      return amount;
    }

    return null;
  }

  private extractCustomerName(lines: string[]): string | undefined {
    const nameLabelRegex = /(?:ad\s*soyad|ad\s*soyad[ıi]|ad|isim|müşteri|musteri|name|customer)\s*[:\-]?\s*(.*)$/i;

    const labelStarts = ['musteri', 'isim', 'ad soyad', 'ad:', 'name', 'customer'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const simplifiedLine = this.simplifyTurkish(line);
      const hasNameLabel = labelStarts.some((label) => simplifiedLine.startsWith(label));

      if (hasNameLabel) {
        let inline = line.split(/[:\-]/).slice(1).join(' ').trim();
        if (!inline) {
          inline = line
            .replace(/^(?:m[üu]şteri|musteri|isim|ad\s*soyad|ad|name|customer)\s*/i, '')
            .trim();

          if (!inline) {
            inline = line
              .trim()
              .split(/\s+/)
              .slice(1)
              .join(' ')
              .trim();
          }
        }
        if (this.isLikelyCustomerName(inline)) {
          return this.sanitizeCustomerName(inline);
        }

        const nextLine = lines[i + 1]?.trim();
        if (nextLine && this.isLikelyCustomerName(nextLine)) {
          return this.sanitizeCustomerName(nextLine);
        }
      }

      const match = line.match(nameLabelRegex);
      if (!match) continue;

      const currentLineValue = (match[1] || '').trim();
      if (this.isLikelyCustomerName(currentLineValue)) {
        return this.sanitizeCustomerName(currentLineValue);
      }

      const next = lines[i + 1]?.trim();
      if (next && this.isLikelyCustomerName(next)) {
        return this.sanitizeCustomerName(next);
      }
    }

    const fullNameLine = lines.find((line) => {
      if (line.length < 4 || line.length > 55) return false;
      if (this.isAddressLike(line) || this.hasPhone(line) || this.hasTime(line)) return false;
      const lower = line.toLowerCase();
      if (this.stopWords.some((word) => lower.includes(word))) return false;
      return this.isLikelyCustomerName(line);
    });

    return fullNameLine ? this.sanitizeCustomerName(fullNameLine) : undefined;
  }

  private extractAddress(text: string, lines: string[]): string | undefined {
    const addressLabelRegex = /(teslimat\s*adresi|adres|teslimat|delivery\s*address|address)\s*[:\-]?\s*(.*)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(addressLabelRegex);
      if (!match) continue;

      const chunks: string[] = [];
      if (match[2]?.trim()) {
        const sameLine = this.sanitizeDeliveryAddress(match[2].trim());
        if (sameLine) {
          chunks.push(sameLine);
        }
      }

      for (let j = i + 1; j < lines.length && j <= i + 3; j++) {
        const next = lines[j].trim();
        if (!next) break;
        const lower = next.toLowerCase();
        const itemLikeLine = /(?:\b\d+\s*x\b|\bx\s*\d+|[a-zA-ZğüşıöçĞÜŞİÖÇ]{2,}\s*\d{2,}[.,]?\d*)/i.test(next);
        const hasPhoneOrTime = this.hasPhone(next) || this.hasTime(next);
        if (this.stopWords.some((word) => lower.includes(word))) break;
        if (/\d+[.,]?\d*\s*(₺|tl)/i.test(next)) break;
        if (itemLikeLine) break;
        const cleanedNext = this.sanitizeDeliveryAddress(next);
        if (cleanedNext && (!hasPhoneOrTime || this.isAddressLike(cleanedNext))) {
          chunks.push(cleanedNext);
        }
      }

      if (chunks.length > 0) {
        const cleaned = this.sanitizeDeliveryAddress(chunks.join(' ').replace(/\s{2,}/g, ' ').trim());
        if (cleaned.length >= 6) {
          return cleaned;
        }
      }
    }

    const addressLikeLine = lines.find((line) =>
      /(mahalle|mah\.|sokak|sk\.|cadde|cd\.|apartman|apt\.|site|blok|daire|no\s*:?)\b/i.test(line)
    );
    if (addressLikeLine) {
      const cleaned = this.sanitizeDeliveryAddress(addressLikeLine.trim());
      if (cleaned.length >= 6) {
        return cleaned;
      }
    }

    const inlineAddress = text.match(/[^\n]{0,24}(?:mahalle|mah\.|sokak|sk\.|cadde|cd\.|apartman|apt\.|site|blok|daire|no\s*:?)\s*[^\n]{8,}/i);
    const cleanedInline = inlineAddress?.[0] ? this.sanitizeDeliveryAddress(inlineAddress[0].trim()) : undefined;
    if (cleanedInline && cleanedInline.length >= 6) {
      return cleanedInline;
    }

    const fallbackDelivery = lines
      .map((line) => this.sanitizeDeliveryAddress(line))
      .filter((line) => line.length >= 10)
      .find((line) => this.isAddressLike(line));

    return fallbackDelivery;
  }

  private calculateQuality(confidence: number, missingCount: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (confidence >= 82 && missingCount <= 1) {
      return 'HIGH';
    }

    if (confidence >= 65 && missingCount <= 2) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private async preprocessImageVariants(imagePath: string): Promise<OCRImageVariant[]> {
    const base = sharp(imagePath).rotate().resize({ width: 1100, withoutEnlargement: true }).grayscale();

    const [normalized, thresholded, sharpened] = await Promise.all([
      base.clone().normalize().sharpen({ sigma: 1.1 }).toBuffer(),
      base.clone().normalize().threshold(185).toBuffer(),
      base.clone().linear(1.15, -8).sharpen({ sigma: 1.5 }).toBuffer()
    ]);

    return [
      { name: 'normalized-sharpened', input: normalized },
      { name: 'thresholded', input: thresholded },
      { name: 'contrast-sharpened', input: sharpened }
    ];
  }

  /**
   * Görüntüden metin çıkarma (OCR)
   */
  async extractTextFromImage(imagePath: string): Promise<{ text: string; confidence: number; variant: string; candidates: OCRDebugCandidate[] }> {
    try {
      let imageInputs: OCRImageVariant[] = [{ name: 'original', input: imagePath }];
      try {
        imageInputs = [...(await this.preprocessImageVariants(imagePath)), { name: 'original', input: imagePath }];
      } catch (error) {
        console.warn('OCR pre-processing failed, falling back to original image', error);
      }

      let bestResult: { text: string; confidence: number; score: number; variant: string } | null = null;
      const candidates: OCRDebugCandidate[] = [];

      for (const imageVariant of imageInputs) {
        const { data } = await Tesseract.recognize(imageVariant.input, 'tur', {
          logger: () => undefined
        });

        const parsed = this.parseOrderFromText(data.text);
        const score = this.scoreExtractionCandidate(parsed, data.confidence);
        const missingFields = this.collectMissingFields(parsed);
        candidates.push({
          source: 'OCR',
          variant: imageVariant.name,
          confidence: data.confidence,
          score,
          quality: this.calculateQuality(data.confidence, missingFields.length),
          missingFields
        });

        if (!bestResult || score > bestResult.score) {
          bestResult = {
            text: data.text,
            confidence: data.confidence,
            score,
            variant: imageVariant.name
          };
        }

        if (score >= 135) {
          break;
        }
      }

      if (!bestResult) {
        throw new Error('OCR candidate evaluation failed');
      }

      return {
        text: bestResult.text,
        confidence: bestResult.confidence,
        variant: bestResult.variant,
        candidates
      };
    } catch (error) {
      console.error('OCR hatası:', error);
      throw new Error('Görüntüden metin çıkarılamadı');
    }
  }

  /**
   * OCR metninden sipariş bilgilerini parse etme
   */
  parseOrderFromText(text: string): ExtractedOrderData {
    const normalizedText = this.normalizeText(text);
    const lines = normalizedText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    
    const orderData: ExtractedOrderData = {
      rawText: normalizedText,
      confidence: 0,
      items: [],
      quality: 'LOW',
      missingFields: []
    };

    const phoneMatches = normalizedText.match(/(?:\+?90\s*)?(?:\(?0?5\d{2}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2})/g);
    if (phoneMatches && phoneMatches.length > 0) {
      const normalizedPhones = phoneMatches
        .map((phone) => this.normalizePhone(phone))
        .filter((phone) => phone.length >= 10);

      if (normalizedPhones.length > 0) {
        orderData.customerPhone = normalizedPhones[0];
      }
    }

    orderData.customerName = this.extractCustomerName(lines);
    if (orderData.customerName) {
      let cleanedName = orderData.customerName.replace(/\s{2,}/g, ' ').trim();
      const simplifiedName = this.simplifyTurkish(cleanedName);

      if (['musteri', 'isim', 'name', 'customer', 'ad', 'ad soyad'].some((prefix) => simplifiedName.startsWith(prefix))) {
        cleanedName = cleanedName.split(/\s+/).slice(1).join(' ').trim() || cleanedName;
      }

      cleanedName = cleanedName
        .replace(/^(?:m[üu]?[sş]ter[iıİI]|isim|ad\s*soyad|ad|name|customer)\s*/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      orderData.customerName = cleanedName;
    }

    orderData.deliveryAddress = this.extractAddress(normalizedText, lines);
    if (orderData.deliveryAddress) {
      const cleanedDelivery = this.sanitizeDeliveryAddress(orderData.deliveryAddress);
      orderData.deliveryAddress = cleanedDelivery || orderData.deliveryAddress;
    }

    const totalCandidates: Array<{ amount: number; label: string }> = [];
    const payableKeywords = ['indirimli', 'odenecek', 'tahsil', 'net', 'fatura', 'fis', 'fiş', 'odeme'];
    const subtotalKeywords = ['ara toplam', 'aratoplam', 'subtotal'];
    const finalKeywords = ['genel toplam', 'toplam', 'total', 'tutar', 'odenecek', 'tahsil', 'net', 'fatura', 'fis', 'fiş', 'odeme'];
    const discountLineKeywords = ['indirim', 'kampanya', 'kupon'];
    let subtotalAmount: number | null = null;
    let discountAmount: number | null = null;

    for (const line of lines) {
      const simplifiedLine = this.simplifyTurkish(line);
      const isSubtotal = subtotalKeywords.some((keyword) => simplifiedLine.includes(keyword));
      if (isSubtotal) {
        const amount = this.extractAmountFromLine(line);
        if (amount) {
          subtotalAmount = Math.max(subtotalAmount ?? 0, amount);
        }
        continue;
      }

      if (discountLineKeywords.some((keyword) => simplifiedLine.includes(keyword)) && !payableKeywords.some((keyword) => simplifiedLine.includes(keyword))) {
        const amount = this.extractAmountFromLine(line);
        if (amount) {
          discountAmount = Math.max(discountAmount ?? 0, amount);
        }
      }

      const hasFinalKeyword = finalKeywords.some((keyword) => simplifiedLine.includes(keyword));
      const hasPayableKeyword = payableKeywords.some((keyword) => simplifiedLine.includes(keyword));
      if (!hasFinalKeyword && !hasPayableKeyword) continue;

      if (simplifiedLine.includes('indirim') && !payableKeywords.some((keyword) => simplifiedLine.includes(keyword))) {
        continue;
      }

      const amount = this.extractAmountFromLine(line);
      if (!amount) continue;

      totalCandidates.push({ amount, label: simplifiedLine });
    }

    if (totalCandidates.length > 0) {
      const payableCandidates = totalCandidates.filter((candidate) =>
        payableKeywords.some((keyword) => candidate.label.includes(keyword))
      );

      if (payableCandidates.length > 0) {
        orderData.orderAmount = Math.min(...payableCandidates.map((candidate) => candidate.amount));
      } else {
        orderData.orderAmount = Math.max(...totalCandidates.map((candidate) => candidate.amount));
      }
    }

    if (subtotalAmount !== null && discountAmount !== null) {
      const discountedTotal = subtotalAmount - discountAmount;
      if (discountedTotal > 0 && (!orderData.orderAmount || discountedTotal < orderData.orderAmount)) {
        orderData.orderAmount = discountedTotal;
      }
    }

    if (!orderData.orderAmount) {
      const payableLines = lines.filter((line) =>
        payableKeywords.some((keyword) => this.simplifyTurkish(line).includes(keyword))
      );
      const payableAmounts = payableLines
        .map((line) => this.extractAmountFromLine(line))
        .filter((value): value is number => value !== null);

      if (payableAmounts.length > 0) {
        orderData.orderAmount = Math.min(...payableAmounts);
      }
    }

    if (subtotalAmount !== null) {
      orderData.subtotalAmount = subtotalAmount;
    }

    if (discountAmount !== null) {
      orderData.discountAmount = discountAmount;
    }

    if (orderData.orderAmount) {
      orderData.payableAmount = orderData.orderAmount;
    }

    if (!orderData.orderAmount) {
      const priceMatches = normalizedText.match(/[\d.,]+\s*(?:₺|tl|lira)/gi);
      if (priceMatches && priceMatches.length > 0) {
        const prices = priceMatches
          .map((priceText) => this.parseAmount(priceText))
          .filter((value) => !Number.isNaN(value) && value > 0);

        if (prices.length > 0) {
          orderData.orderAmount = Math.max(...prices);
        }
      }
    }

    const itemLines = lines.filter((line) => {
      const hasPrice = /\d+[.,]?\d*\s*(?:₺|tl|lira)/i.test(line);
      const hasQuantity = /(?:\b\d+\s*(?:x|adet|ad)\b|x\s*\d+)/i.test(line);
      const hasNamePlusNumber = /[a-zA-ZğüşıöçĞÜŞİÖÇ]{2,}\s*\d{2,}[.,]?\d*/.test(line);
      const isStopLine = /(toplam|total|tutar|adres|telefon|tel|müşteri|musteri|not|teslimat)/i.test(line);
      return (hasPrice || hasQuantity || hasNamePlusNumber) && !isStopLine && line.length > 2;
    });
    
    orderData.items = itemLines
      .map((line) => line.replace(/^[\-•*\s]+/, '').trim())
      .filter((line) => line.length > 1)
      .slice(0, 25);

    const notesPatterns = [
      /(?:not|note|özel\s*istek|aciklama|açıklama)\s*[:\-]?\s*([^\n]+(?:\n[^\n]+)?)/i
    ];
    
    for (const pattern of notesPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        orderData.notes = match[1].trim().replace(/\s+/g, ' ');
        break;
      }
    }

    return orderData;
  }

  /**
   * Görüntüyü işleyip sipariş verilerini çıkar
   */
  async processOrderImage(imagePath: string): Promise<ExtractedOrderData> {
    try {
      const aiResult = await this.extractByAI(imagePath);
      const debugCandidates: OCRDebugCandidate[] = aiResult.candidate ? [aiResult.candidate] : [];

      let orderData: ExtractedOrderData;
      let confidence = 0;
      let selectedVariant = 'unknown';

      if (aiResult.data) {
        confidence = aiResult.data.orderAmount && aiResult.data.deliveryAddress && aiResult.data.customerName ? 90 : 75;
        orderData = this.finalizeOrderData({
          rawText: '[AI_EXTRACTION]',
          confidence: 0,
          items: [],
          quality: 'MEDIUM',
          missingFields: [],
          customerName: aiResult.data.customerName,
          customerPhone: aiResult.data.customerPhone,
          deliveryAddress: aiResult.data.deliveryAddress,
          pickupAddress: aiResult.data.pickupAddress,
          orderAmount: aiResult.data.orderAmount,
          subtotalAmount: aiResult.data.subtotalAmount,
          discountAmount: aiResult.data.discountAmount,
          payableAmount: aiResult.data.payableAmount,
          notes: aiResult.data.notes,
          extractionSource: 'AI'
        }, confidence);
        selectedVariant = 'ai-json-extraction';
      } else {
        // OCR ile metin çıkar
        const extracted = await this.extractTextFromImage(imagePath);
        const textData = this.parseOrderFromText(extracted.text);
        textData.extractionSource = 'OCR';
        orderData = this.finalizeOrderData(textData, extracted.confidence);
        confidence = extracted.confidence;
        selectedVariant = extracted.variant;
        debugCandidates.push(...extracted.candidates);
      }

      orderData.debug = {
        aiAttempted: Boolean(this.aiConfig.apiKey),
        aiAccepted: Boolean(aiResult.data),
        aiRejectedReason: aiResult.data ? undefined : aiResult.rejectedReason,
        selectedSource: orderData.extractionSource || 'OCR',
        selectedVariant,
        candidates: debugCandidates.sort((left, right) => right.score - left.score)
      };

      return orderData;
    } catch (error) {
      console.error('Sipariş işleme hatası:', error);
      throw error;
    } finally {
      // İşlem bittikten sonra dosyayı sil
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
  }
}

export const ocrService = new OCRService();
