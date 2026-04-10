import { useGroceryItems } from '../../hooks/useGroceryItems.js';
import Table from '../ui/Table.jsx';
import Spinner from '../ui/Spinner.jsx';

const columns = [
  { key: 'canonical_name', label: 'Name' },
  { key: 'category', label: 'Category', render: (row) => row.category || '—' },
  { key: 'unit_type', label: 'Unit Type', render: (row) => row.unit_type || '—' },
];

export default function GroceryItemsTab() {
  const { data, loading, error } = useGroceryItems();

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
      emptyMessage="No canonical grocery items yet. Add them on the Grocery Items page."
    />
  );
}
