import { useStoreItems } from '../../hooks/useStoreItems.js';
import Table from '../ui/Table.jsx';
import Spinner from '../ui/Spinner.jsx';

const columns = [
  { key: 'name_on_receipt', label: 'Name on Receipt' },
  {
    key: 'price',
    label: 'Price',
    render: (row) => `€ ${Number(row.price).toFixed(2)}`,
  },
  {
    key: 'amount_per_unit',
    label: 'Amount',
    render: (row) =>
      row.amount_per_unit != null ? `${row.amount_per_unit} ${row.unit ?? ''}` : '—',
  },
  {
    key: 'is_discount',
    label: 'Discount',
    render: (row) =>
      row.is_discount ? (
        <span className="text-xs text-red-600 font-semibold">
          {row.discount_label || 'Yes'}
        </span>
      ) : (
        '—'
      ),
  },
];

export default function StoreItemsTab({ storeId }) {
  const { data, loading, error } = useStoreItems(storeId);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  return (
    <Table
      columns={columns}
      rows={data}
      emptyMessage="No items found for this store."
    />
  );
}
