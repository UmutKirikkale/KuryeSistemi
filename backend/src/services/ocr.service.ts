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
        if (inline && !/\d/.test(inline) && inline.length >= 4) {
          return inline.replace(/\s+/g, ' ').trim();
        }

        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !/\d/.test(nextLine) && nextLine.length >= 4 && nextLine.length <= 45) {
          return nextLine.replace(/\s+/g, ' ').trim();
        }
      }

      const match = line.match(nameLabelRegex);
      if (!match) continue;

      const currentLineValue = (match[1] || '').trim();
      if (currentLineValue && !/\d/.test(currentLineValue) && currentLineValue.length >= 4) {
        return currentLineValue.replace(/\s+/g, ' ').trim();
      }

      const next = lines[i + 1]?.trim();
      if (next && !/\d/.test(next) && next.length >= 4 && next.length <= 45) {
        return next.replace(/\s+/g, ' ').trim();
      }
    }

    const fullNameLine = lines.find((line) => {
      if (line.length < 4 || line.length > 45) return false;
      if (/\d/.test(line)) return false;
      const lower = line.toLowerCase();
      if (this.stopWords.some((word) => lower.includes(word))) return false;
      return /^[a-zA-ZğüşıöçĞÜŞİÖÇ]+\s+[a-zA-ZğüşıöçĞÜŞİÖÇ]+/.test(line);
    });

    return fullNameLine;
  }

  private extractAddress(text: string, lines: string[]): string | undefined {
    const addressLabelRegex = /(teslimat\s*adresi|adres|teslimat|delivery\s*address|address)\s*[:\-]?\s*(.*)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(addressLabelRegex);
      if (!match) continue;

      const chunks: string[] = [];
      if (match[2]?.trim()) {
        chunks.push(match[2].trim());
      }

      for (let j = i + 1; j < lines.length && j <= i + 3; j++) {
        const next = lines[j].trim();
        if (!next) break;
        const lower = next.toLowerCase();
        const itemLikeLine = /(?:\b\d+\s*x\b|\bx\s*\d+|[a-zA-ZğüşıöçĞÜŞİÖÇ]{2,}\s*\d{2,}[.,]?\d*)/i.test(next);
        if (this.stopWords.some((word) => lower.includes(word))) break;
        if (/\d+[.,]?\d*\s*(₺|tl)/i.test(next)) break;
        if (itemLikeLine) break;
        chunks.push(next);
      }

      if (chunks.length > 0) {
        return chunks.join(' ').replace(/\s{2,}/g, ' ').trim();
      }
    }

    const addressLikeLine = lines.find((line) =>
      /(mahalle|mah\.|sokak|sk\.|cadde|cd\.|apartman|apt\.|site|blok|daire|no\s*:?)\b/i.test(line)
    );
    if (addressLikeLine) {
      return addressLikeLine.trim();
    }

    const inlineAddress = text.match(/[^\n]{0,24}(?:mahalle|mah\.|sokak|sk\.|cadde|cd\.|apartman|apt\.|site|blok|daire|no\s*:?)\s*[^\n]{8,}/i);
    return inlineAddress?.[0]?.trim();
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

  private async preprocessImage(imagePath: string): Promise<Buffer> {
    return await sharp(imagePath)
      .rotate()
      .resize({ width: 1400, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .linear(1.1, -10)
      .threshold(160)
      .toBuffer();
  }

  /**
   * Görüntüden metin çıkarma (OCR)
   */
  async extractTextFromImage(imagePath: string): Promise<{ text: string; confidence: number }> {
    try {
      let imageInput: string | Buffer = imagePath;
      try {
        imageInput = await this.preprocessImage(imagePath);
      } catch (error) {
        console.warn('OCR pre-processing failed, falling back to original image', error);
      }

      const { data } = await Tesseract.recognize(imageInput, 'tur+eng', {
        logger: (m) => console.log(m)
      });

      return {
        text: data.text,
        confidence: data.confidence
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
      // OCR ile metin çıkar
      const { text, confidence } = await this.extractTextFromImage(imagePath);

      // Metni parse et
      const orderData = this.parseOrderFromText(text);
      orderData.confidence = confidence;

      const requiredFieldChecks: Array<{ field: string; exists: boolean }> = [
        { field: 'customerName', exists: Boolean(orderData.customerName) },
        { field: 'customerPhone', exists: Boolean(orderData.customerPhone) },
        { field: 'deliveryAddress', exists: Boolean(orderData.deliveryAddress) },
        { field: 'orderAmount', exists: Boolean(orderData.orderAmount && orderData.orderAmount > 0) }
      ];

      orderData.missingFields = requiredFieldChecks
        .filter((item) => !item.exists)
        .map((item) => item.field);

      orderData.quality = this.calculateQuality(confidence, orderData.missingFields.length);

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
