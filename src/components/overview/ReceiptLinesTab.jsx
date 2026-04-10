import Badge from '../ui/Badge.jsx';
import Table from '../ui/Table.jsx';

const columns = [
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge isNew={row.is_new_store_item} />,
  },
  {
    key: 'name',
    label: 'Product',
    render: (row) => (
      <span className={row.unit_price < 0 ? 'italic text-red-600' : ''}>
        {row.store_item?.name_on_receipt ?? '—'}
        {row.store_item?.discount_label && (
          <span className="ml-2 text-xs text-red-500 font-semibold">
            {row.store_item.discount_label}
          </span>
        )}
      </span>
    ),
  },
  {
    key: 'quantity',
    label: 'Qty',
    render: (row) => Number(row.quantity),
  },
  {
    key: 'unit_price',
    label: 'Unit Price',
    render: (row) => (
      <span className={row.unit_price < 0 ? 'text-red-600' : ''}>
        € {Number(row.unit_price).toFixed(2)}
      </span>
    ),
  },
  {
    key: 'line_total',
    label: 'Line Total',
    render: (row) => (
      <span className={row.line_total < 0 ? 'text-red-600' : ''}>
        € {Number(row.line_total).toFixed(2)}
      </span>
    ),
  },
];

export default function ReceiptLinesTab({ lines }) {
  const newCount = lines.filter(l => l.is_new_store_item).length;

  return (
    <div className="space-y-3">
      {newCount > 0 && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-4 py-2">
          {newCount} new product{newCount > 1 ? 's' : ''} added to the store catalogue.
        </p>
      )}
      <Table
        columns={columns}
        rows={lines}
        emptyMessage="No line items found on this receipt."
      />
    </div>
  );
}
