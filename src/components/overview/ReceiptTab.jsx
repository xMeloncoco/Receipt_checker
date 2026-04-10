export default function ReceiptTab({ receipt, store, isDuplicate, existingReceiptId }) {
  if (isDuplicate) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-5 py-4">
          <p className="font-semibold text-amber-800 text-sm">
            Duplicate receipt detected
          </p>
          <p className="text-amber-700 text-sm mt-1">
            This receipt matches an existing entry (ID: <code className="font-mono">{existingReceiptId}</code>).
            No new data was saved.
          </p>
        </div>
        {store && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-white border border-gray-100 rounded-lg p-5">
            <dt className="text-gray-500">Store</dt>
            <dd className="text-gray-800 font-medium">{store.name}</dd>
          </dl>
        )}
      </div>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm bg-white border border-gray-100 rounded-lg p-5">
      <dt className="text-gray-500">Store</dt>
      <dd className="text-gray-800 font-medium">{store?.name ?? '—'}</dd>

      <dt className="text-gray-500">Chain</dt>
      <dd className="text-gray-800">{store?.chain ?? '—'}</dd>

      <dt className="text-gray-500">Location</dt>
      <dd className="text-gray-800">{store?.location ?? '—'}</dd>

      <dt className="text-gray-500">Date</dt>
      <dd className="text-gray-800">{receipt?.purchase_date ?? '—'}</dd>

      <dt className="text-gray-500">Time</dt>
      <dd className="text-gray-800">{receipt?.purchase_time ?? '—'}</dd>

      <dt className="text-gray-500">Total</dt>
      <dd className="text-gray-800 font-semibold">
        {receipt?.total_amount != null
          ? `€ ${Number(receipt.total_amount).toFixed(2)}`
          : '—'}
      </dd>
    </dl>
  );
}
