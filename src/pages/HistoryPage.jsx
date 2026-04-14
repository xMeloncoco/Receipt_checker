import { useReceipts } from '../hooks/useReceipts.js';
import Table from '../components/ui/Table.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const columns = [
  {
    key: 'store',
    label: 'Store',
    render: (row) => row.stores?.name ?? '—',
  },
  { key: 'purchase_date', label: 'Date' },
  {
    key: 'purchase_time',
    label: 'Time',
    render: (row) => row.purchase_time ?? '—',
  },
  {
    key: 'total_with_discount',
    label: 'Total',
    render: (row) => `€ ${Number(row.total_with_discount).toFixed(2)}`,
  },
  {
    key: 'created_at',
    label: 'Uploaded',
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

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
          <Table
            columns={columns}
            rows={data}
            emptyMessage="No receipts uploaded yet. Go to Upload to add your first receipt."
          />
        </div>
      )}
    </div>
  );
}
