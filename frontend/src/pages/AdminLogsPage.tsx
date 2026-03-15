import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services/adminService';

interface LogEntry {
  id: string;
  type: string;
  action: string;
  description: string;
  timestamp: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [actionFilter, setActionFilter] = useState<'ALL' | 'DELIVERED' | 'CANCELLED' | 'PENDING'>('ALL');
  const [query, setQuery] = useState('');

  const fetchLogs = useCallback(async (nextLimit: number) => {
    try {
      setLoading(true);
      const response = await adminService.getSystemLogs(nextLimit);
      setLogs(response.logs || []);
    } catch (error) {
      console.error('Failed to load system logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(limit);
  }, [fetchLogs, limit]);

  const loadMore = () => {
    setLimit((prev) => prev + 50);
  };

  const visibleLogs = logs.filter((log) => {
    const actionOk = actionFilter === 'ALL' || log.action === actionFilter;
    if (!actionOk) {
      return false;
    }

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    const haystack = `${log.action} ${log.description}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const deliveredCount = logs.filter((log) => log.action === 'DELIVERED').length;
  const cancelledCount = logs.filter((log) => log.action === 'CANCELLED').length;
  const pendingCount = logs.filter((log) => log.action === 'PENDING').length;

  const csvEscape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

  const formatDateTr = (value: string) =>
    new Date(value).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

  const exportCsv = () => {
    const rows = [
      ['ID', 'Tip', 'Durum', 'Aciklama', 'Zaman'],
      ...visibleLogs.map((log) => [
        log.id,
        log.type,
        log.action,
        log.description,
        formatDateTr(log.timestamp)
      ])
    ];

    const csv = rows
      .map((row) => row.map((cell) => csvEscape(cell)).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sistem Logları</h1>
            <p className="text-sm text-gray-600">Son sipariş hareketleri</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadMore} className="btn btn-primary">+50 Yükle</button>
            <button onClick={exportCsv} className="btn btn-secondary" disabled={visibleLogs.length === 0}>CSV İndir</button>
            <Link to="/dashboard" className="btn btn-secondary">Panele Dön</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card bg-emerald-50 border-emerald-100">
            <p className="text-sm text-emerald-700">Teslim Edilen</p>
            <p className="text-2xl font-bold text-emerald-900">{deliveredCount}</p>
          </div>
          <div className="card bg-red-50 border-red-100">
            <p className="text-sm text-red-700">İptal</p>
            <p className="text-2xl font-bold text-red-900">{cancelledCount}</p>
          </div>
          <div className="card bg-amber-50 border-amber-100">
            <p className="text-sm text-amber-700">Bekleyen</p>
            <p className="text-2xl font-bold text-amber-900">{pendingCount}</p>
          </div>
        </div>

        <div className="card mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button onClick={() => setActionFilter('ALL')} className={`text-xs px-3 py-1.5 rounded-lg border ${actionFilter === 'ALL' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-700'}`}>Tum</button>
            <button onClick={() => setActionFilter('DELIVERED')} className={`text-xs px-3 py-1.5 rounded-lg border ${actionFilter === 'DELIVERED' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-gray-200 text-gray-700'}`}>Teslim</button>
            <button onClick={() => setActionFilter('CANCELLED')} className={`text-xs px-3 py-1.5 rounded-lg border ${actionFilter === 'CANCELLED' ? 'bg-red-600 text-white border-red-600' : 'bg-white border-gray-200 text-gray-700'}`}>Iptal</button>
            <button onClick={() => setActionFilter('PENDING')} className={`text-xs px-3 py-1.5 rounded-lg border ${actionFilter === 'PENDING' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white border-gray-200 text-gray-700'}`}>Bekleyen</button>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Durum veya açıklama ara"
            className="input"
          />
        </div>

        {loading ? (
          <p className="text-gray-600">Yükleniyor...</p>
        ) : visibleLogs.length === 0 ? (
          <p className="text-gray-500">Log kaydı bulunamadı.</p>
        ) : (
          <div className="space-y-3">
            {visibleLogs.map((log) => (
              <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 font-semibold">{log.type}</span>
                  <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString('tr-TR')}</span>
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">{log.action}</div>
                <div className="text-sm text-gray-600">{log.description}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
