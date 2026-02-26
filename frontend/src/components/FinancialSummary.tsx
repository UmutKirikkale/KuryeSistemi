export default function FinancialSummary({ data }: { data: any }) {
  if (!data) {
    return <div className="text-center py-8 text-gray-500">Finansal veri yükleniyor...</div>;
  }

  const { summary, transactions } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-700 mb-1">Brüt Gelir</p>
          <p className="text-2xl font-bold text-green-900">
            {summary.totalEarnings.toFixed(2)} ₺
          </p>
        </div>

        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-700 mb-1">Toplam Komisyon</p>
          <p className="text-2xl font-bold text-red-900">
            {summary.totalCommissions.toFixed(2)} ₺
          </p>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 mb-1">Net Bakiye</p>
          <p className="text-2xl font-bold text-blue-900">
            {summary.netBalance.toFixed(2)} ₺
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div>
        <h3 className="text-lg font-semibold mb-4">İşlem Geçmişi</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tip
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Açıklama
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Tutar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.slice(0, 20).map((transaction: any) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        transaction.transactionType === 'EARNING'
                          ? 'bg-green-100 text-green-800'
                          : transaction.transactionType === 'COURIER_FEE'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {transaction.transactionType === 'EARNING'
                        ? 'Gelir'
                        : transaction.transactionType === 'COURIER_FEE'
                        ? 'Kurye'
                          : 'Komisyon'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    <span
                      className={
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {transaction.amount >= 0 ? '+' : ''}
                      {transaction.amount.toFixed(2)} ₺
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
