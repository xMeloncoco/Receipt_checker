import { Link } from 'react-router-dom';
import { useReceipts } from '../hooks/useReceipts.js';
import Spinner from '../components/ui/Spinner.jsx';

export default function HistoryPage() {
  const { data, loading, error } = useReceipts();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Receipt History</h1>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!loading && !error && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {data.length === 0 ? (
            <p className="py-8 text-center text-gray-400 text-sm">
              No receipts uploaded yet. Go to Upload to add your first receipt.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Store', 'Date', 'Time', 'Total', 'Uploaded', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700">{row.stores?.name ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{row.purchase_date}</td>
                      <td className="px-4 py-2 text-gray-700">{row.purchase_time ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-700">
                        €{Number(row.total_with_discount).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Link
                          to={`/receipts/${row.id}`}
                          className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
