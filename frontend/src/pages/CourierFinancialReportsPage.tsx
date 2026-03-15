import { useState } from 'react';
import { Link } from 'react-router-dom';
import { financialService } from '../services/financialService';

export default function CourierFinancialReportsPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [daily, setDaily] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const money = (value: number) => `${Number(value || 0).toFixed(2)} ₺`;
  const csvEscape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const formatDecimalTr = (value: number) =>
    Number(value || 0).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  const formatDateOnlyTr = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString('tr-TR');
  };

  const fetchDaily = async () => {
    try {
      setLoadingDaily(true);
      const response = await financialService.getDailyReport(date);
      setDaily(response.report);
    } catch (error) {
      console.error('Failed to load daily report:', error);
      setDaily(null);
    } finally {
      setLoadingDaily(false);
    }
  };

  const fetchMonthly = async () => {
    try {
      setLoadingMonthly(true);
      const response = await financialService.getMonthlyReport(Number(year), Number(month));
      setMonthly(response.report);
    } catch (error) {
      console.error('Failed to load monthly report:', error);
      setMonthly(null);
    } finally {
      setLoadingMonthly(false);
    }
  };

  const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
    const csv = rows
      .map((row) => row.map((cell) => csvEscape(cell)).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDailyCsv = () => {
    if (!daily) return;
    downloadCsv(`courier-daily-${date}.csv`, [
      ['Metrik', 'Deger'],
      ['Tarih', formatDateOnlyTr(String(daily.date || date))],
      ['Toplam Teslimat', daily.totalDeliveries || 0],
      ['Toplam Kazanc', formatDecimalTr(daily.totalEarnings || 0)],
      ['Teslimat Basi Ortalama', formatDecimalTr(daily.averageEarningPerDelivery || 0)]
    ]);
  };

  const exportMonthlyCsv = () => {
    if (!monthly) return;
    downloadCsv(`courier-monthly-${year}-${String(month).padStart(2, '0')}.csv`, [
      ['Metrik', 'Deger'],
      ['Donem', monthly.period || `${year}-${String(month).padStart(2, '0')}`],
      ['Toplam Teslimat', monthly.totalDeliveries || 0],
      ['Toplam Kazanc', formatDecimalTr(monthly.totalEarnings || 0)],
      ['Teslimat Basi Ortalama', formatDecimalTr(monthly.averageEarningPerDelivery || 0)]
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kurye Finansal Rapor</h1>
            <p className="text-sm text-gray-600">Günlük ve aylık teslimat kazançları</p>
          </div>
          <Link to="/dashboard" className="btn btn-secondary">Panele Dön</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h2 className="text-lg font-bold">Günlük Rapor</h2>
          <input className="input" value={date} onChange={(e) => setDate(e.target.value)} placeholder="YYYY-MM-DD" />
          <div className="flex items-center gap-2">
            <button className="btn btn-primary" onClick={fetchDaily} disabled={loadingDaily}>{loadingDaily ? 'Yükleniyor...' : 'Getir'}</button>
            <button className="btn btn-secondary" onClick={exportDailyCsv} disabled={!daily}>CSV İndir</button>
          </div>
          {!loadingDaily && !daily && <p className="text-sm text-gray-500">Raporu getirmek için tarih seçin.</p>}
          {daily && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Teslimat</p><p className="font-semibold text-gray-900">{daily.totalDeliveries}</p></div>
              <div className="rounded-lg bg-emerald-50 p-3"><p className="text-emerald-700">Toplam Kazanc</p><p className="font-semibold text-emerald-900">{money(daily.totalEarnings)}</p></div>
              <div className="rounded-lg bg-blue-50 p-3"><p className="text-blue-700">Ortalama/Teslimat</p><p className="font-semibold text-blue-900">{money(daily.averageEarningPerDelivery)}</p></div>
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <h2 className="text-lg font-bold">Aylık Rapor</h2>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Yıl" />
            <input className="input" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="Ay" />
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary" onClick={fetchMonthly} disabled={loadingMonthly}>{loadingMonthly ? 'Yükleniyor...' : 'Getir'}</button>
            <button className="btn btn-secondary" onClick={exportMonthlyCsv} disabled={!monthly}>CSV İndir</button>
          </div>
          {!loadingMonthly && !monthly && <p className="text-sm text-gray-500">Aylik rapor icin yil/ay girin.</p>}
          {monthly && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3 sm:col-span-2"><p className="text-gray-500">Donem</p><p className="font-semibold text-gray-900">{monthly.period}</p></div>
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Teslimat</p><p className="font-semibold text-gray-900">{monthly.totalDeliveries}</p></div>
              <div className="rounded-lg bg-emerald-50 p-3"><p className="text-emerald-700">Toplam Kazanc</p><p className="font-semibold text-emerald-900">{money(monthly.totalEarnings)}</p></div>
              <div className="rounded-lg bg-blue-50 p-3 sm:col-span-2"><p className="text-blue-700">Ortalama/Teslimat</p><p className="font-semibold text-blue-900">{money(monthly.averageEarningPerDelivery)}</p></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
