import { useState, useRef } from 'react';
import { X, Upload, FileImage, Loader2, CheckCircle } from 'lucide-react';
import { ocrService, ExtractedOrderData } from '../services/ocrService';
import { useOrderStore } from '../store/orderStore';

interface OCROrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function OCROrderModal({ onClose, onSuccess }: OCROrderModalProps) {
  const { createOrder, isLoading } = useOrderStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedOrderData | null>(null);
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [lowQualityDetected, setLowQualityDetected] = useState(false);
  const [allowLowQualityProceed, setAllowLowQualityProceed] = useState(false);
  const [invoiceSummary, setInvoiceSummary] = useState({
    discount: '',
    payable: ''
  });
  
  const [formData, setFormData] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    pickupLatitude: 35.1264,
    pickupLongitude: 33.4299,
    deliveryLatitude: 35.1364,
    deliveryLongitude: 33.4399,
    orderAmount: '',
    customerName: '',
    customerPhone: '',
    sourcePlatform: '',
    externalOrderId: '',
    notes: ''
  });

  const fieldLabelMap: Record<string, string> = {
    customerName: 'Müşteri adı',
    customerPhone: 'Müşteri telefonu',
    deliveryAddress: 'Teslimat adresi',
    orderAmount: 'Sipariş tutarı'
  };

  const qualityLabelMap: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
    LOW: 'Düşük',
    MEDIUM: 'Orta',
    HIGH: 'Yüksek'
  };

  const qualityClassMap: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
    LOW: 'bg-red-100 text-red-700 border-red-200',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    HIGH: 'bg-green-100 text-green-700 border-green-200'
  };

  const resetToUpload = () => {
    setStep('upload');
    setExtractedData(null);
    setSelectedFile(null);
    setPreviewUrl('');
    setLowQualityDetected(false);
    setAllowLowQualityProceed(false);
    setInvoiceSummary({ discount: '', payable: '' });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setStep('processing');

    try {
      const response = await ocrService.extractOrderFromImage(selectedFile);
      setExtractedData(response.data);
      
      // Form verilerini OCR sonuçlarıyla doldur
      setFormData(prev => ({
        ...prev,
        customerName: response.suggestions.customerName || prev.customerName,
        customerPhone: response.suggestions.customerPhone || prev.customerPhone,
        deliveryAddress: response.suggestions.deliveryAddress || prev.deliveryAddress,
        pickupAddress: response.suggestions.pickupAddress || prev.pickupAddress,
        orderAmount: response.suggestions.orderAmount?.toString() || prev.orderAmount,
        notes: response.suggestions.notes || prev.notes
      }));

      const detectedLowQuality = response.data.quality === 'LOW' || response.data.confidence < 50;
      setLowQualityDetected(detectedLowQuality);
      setAllowLowQualityProceed(false);

      const discountValue = response.suggestions.discountAmount || response.data.discountAmount || 0;
      const payableValue = response.suggestions.payableAmount || response.data.payableAmount || response.suggestions.orderAmount || 0;

      setInvoiceSummary({
        discount: discountValue ? discountValue.toString() : '',
        payable: payableValue ? payableValue.toString() : ''
      });

      setStep('review');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Bilinmeyen hata';
      console.error('OCR hatası:', error);
      alert('❌ Fotoğraf işlenirken hata oluştu: ' + errorMsg);
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payableAmount = parseFloat(invoiceSummary.payable) || parseFloat(formData.orderAmount) || 0;

      if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
        alert('❌ Sipariş oluşturulamadı: Sipariş tutarı 0’dan büyük olmalıdır.');
        return;
      }

      if (!formData.customerName.trim() || !formData.customerPhone.trim()) {
        alert('❌ Sipariş oluşturulamadı: Müşteri adı ve telefonu zorunludur.');
        return;
      }

      if (!formData.pickupAddress.trim() || !formData.deliveryAddress.trim()) {
        alert('❌ Sipariş oluşturulamadı: Alış ve teslimat adresleri zorunludur.');
        return;
      }

      if (formData.sourcePlatform && !formData.externalOrderId.trim()) {
        alert('❌ Sipariş oluşturulamadı: Platform seçiliyse platform sipariş no zorunludur.');
        return;
      }

      await createOrder({
        ...formData,
        pickupAddress: formData.pickupAddress.trim(),
        deliveryAddress: formData.deliveryAddress.trim(),
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        sourcePlatform: formData.sourcePlatform || undefined,
        externalOrderId: formData.externalOrderId.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        orderAmount: payableAmount
      });
      alert('✅ Sipariş başarıyla oluşturuldu!');
      onSuccess();
    } catch (error: any) {
      const zodMessage = Array.isArray(error?.response?.data?.error)
        ? error.response.data.error[0]?.message
        : undefined;
      const apiMessage = error?.response?.data?.error;
      const errorMsg = zodMessage || apiMessage || error?.message || 'Bilinmeyen hata';
      alert('❌ Sipariş oluşturulamadı: ' + errorMsg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Upload className="w-6 h-6" />
            <div>
              <h3 className="text-xl font-bold">Fotoğraftan Sipariş Oluştur</h3>
              <p className="text-sm text-purple-100">Sipariş fotoğrafını yükleyin, otomatik oluşturulsun</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
            title="Kapat"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  📸 <strong>Nasıl çalışır?</strong> Sipariş fotoğrafını yükleyin, sistem otomatik olarak müşteri adı, telefon, adres ve tutar bilgilerini çıkaracak.
                </p>
              </div>

              {/* File Upload Area */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  id="orderImageUpload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  title="Sipariş fotoğrafı yükle"
                  aria-label="Sipariş fotoğrafı yükle"
                  onChange={handleFileSelect}
                />
                
                {!selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <FileImage className="w-16 h-16 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-700">Fotoğraf Yükle</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Tıklayın veya sürükle bırakın
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        JPG, PNG, GIF (Maks. 10MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <img src={previewUrl} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
                    <p className="text-sm text-gray-600 font-medium">{selectedFile.name}</p>
                  </div>
                )}
              </div>

              {/* Process Button */}
              {selectedFile && (
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Fotoğrafı İşle</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <p className="text-lg font-medium text-gray-700">Fotoğraf işleniyor...</p>
              <p className="text-sm text-gray-500">
                ⏱️ Bu işlem fotoğraf kalitesine göre 10-30 saniye sürebilir
              </p>
            </div>
          )}

          {/* Step 3: Review & Edit */}
          {step === 'review' && extractedData && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {lowQualityDetected && (
                <div className="border border-amber-300 bg-amber-50 rounded-lg p-4 text-sm text-amber-800">
                  <p className="font-semibold">⚠️ Düşük OCR Kalitesi</p>
                  <p className="mt-1">
                    Fiş fotoğrafı düşük kalite algılandı. Daha net bir fotoğrafla tekrar denemeniz önerilir.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={resetToUpload}
                      className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Yeni Fotoğraf Çek
                    </button>
                    <label className="flex items-center gap-2 text-amber-900">
                      <input
                        type="checkbox"
                        checked={allowLowQualityProceed}
                        onChange={(event) => setAllowLowQualityProceed(event.target.checked)}
                        className="w-4 h-4 text-amber-600"
                      />
                      Yine de devam etmek istiyorum
                    </label>
                  </div>
                </div>
              )}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-900">
                    <strong>Başarılı!</strong> Sipariş bilgileri çıkarıldı. 
                    Doğruluk oranı: <span className="font-semibold">{extractedData.confidence.toFixed(0)}%</span>
                  </p>
                </div>

                {extractedData.quality && (
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${qualityClassMap[extractedData.quality]}`}
                    >
                      OCR Kalitesi: {qualityLabelMap[extractedData.quality]}
                    </span>
                  </div>
                )}

                {extractedData.missingFields && extractedData.missingFields.length > 0 && (
                  <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
                    Eksik görünen alanlar: {' '}
                    {extractedData.missingFields
                      .map((field) => fieldLabelMap[field] || field)
                      .join(', ')}.
                    Lütfen bu alanları kontrol edin.
                  </div>
                )}
              </div>

              {/* Preview Image */}
              {previewUrl && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-2">Yüklenen Fotoğraf:</p>
                  <img src={previewUrl} alt="Order" className="max-h-40 rounded-lg shadow-sm" />
                </div>
              )}

              {/* Extracted Items */}
              {extractedData.items && extractedData.items.length > 0 && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <p className="text-sm font-medium text-blue-900 mb-2">Çıkarılan Ürünler:</p>
                  <ul className="text-xs text-blue-800 space-y-1 max-h-32 overflow-y-auto">
                    {extractedData.items.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                    Müşteri Adı *
                  </label>
                  <input
                    id="customerName"
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ahmet Yılmaz"
                  />
                </div>

                <div>
                  <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-2">
                    Müşteri Telefonu *
                  </label>
                  <input
                    id="customerPhone"
                    type="tel"
                    required
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0555 123 45 67"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-700 mb-2">
                    Alış Adresi *
                  </label>
                  <input
                    id="pickupAddress"
                    type="text"
                    required
                    value={formData.pickupAddress}
                    onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Restoran adresi"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-2">
                    Teslimat Adresi *
                  </label>
                  <input
                    id="deliveryAddress"
                    type="text"
                    required
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Müşteri teslimat adresi"
                  />
                </div>

                <div>
                  <label htmlFor="orderAmount" className="block text-sm font-medium text-gray-700 mb-2">
                    Sipariş Tutarı (₺) *
                  </label>
                  <input
                    id="orderAmount"
                    type="number"
                    step="0.01"
                    required
                    value={formData.orderAmount}
                    onChange={(e) => setFormData({ ...formData, orderAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notlar
                  </label>
                  <input
                    id="notes"
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Özel istekler..."
                  />
                </div>

                <div>
                  <label htmlFor="ocrSourcePlatform" className="block text-sm font-medium text-gray-700 mb-2">
                    Sipariş Platformu
                  </label>
                  <select
                    id="ocrSourcePlatform"
                    value={formData.sourcePlatform}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sourcePlatform: e.target.value,
                        externalOrderId: e.target.value ? formData.externalOrderId : ''
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Platform Yok</option>
                    <option value="FEEDME">Feedme</option>
                    <option value="YEMEKSEPETI">Yemeksepeti</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ocrExternalOrderId" className="block text-sm font-medium text-gray-700 mb-2">
                    Platform Sipariş No
                  </label>
                  <input
                    id="ocrExternalOrderId"
                    type="text"
                    value={formData.externalOrderId}
                    disabled={!formData.sourcePlatform}
                    onChange={(e) => setFormData({ ...formData, externalOrderId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder={formData.sourcePlatform ? 'Örn: YS-123456' : 'Önce platform seçin'}
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-3">Fatura Ozeti</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="invoiceDiscount" className="block text-xs font-medium text-gray-600 mb-1">
                      Indirim
                    </label>
                    <input
                      id="invoiceDiscount"
                      type="number"
                      step="0.01"
                      value={invoiceSummary.discount}
                      onChange={(e) => setInvoiceSummary({ ...invoiceSummary, discount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label htmlFor="invoicePayable" className="block text-xs font-medium text-gray-600 mb-1">
                      Odenecek
                    </label>
                    <input
                      id="invoicePayable"
                      type="number"
                      step="0.01"
                      value={invoiceSummary.payable}
                      onChange={(e) => {
                        const value = e.target.value;
                        setInvoiceSummary({ ...invoiceSummary, payable: value });
                        setFormData({ ...formData, orderAmount: value });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Siparis tutari olarak odenecek tutar kullanilir.
                </p>
              </div>

              {/* Raw Text (Collapsible) */}
              {extractedData.rawText && (
                <details className="border rounded-lg p-4 bg-gray-50">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                    Ham Metin (Detay)
                  </summary>
                  <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {extractedData.rawText}
                  </pre>
                </details>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    resetToUpload();
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ← Yeni Fotoğraf
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (lowQualityDetected && !allowLowQualityProceed)}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Oluşturuluyor...' : '✓ Siparişi Oluştur'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
