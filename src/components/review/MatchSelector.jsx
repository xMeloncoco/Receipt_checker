export default function MatchSelector({ candidates, onSelect, onAddNew, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Multiple Matches Found
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          This item name exists with different brand/amount combinations.
          Choose the correct match or add a new entry.
        </p>

        <div className="space-y-2 mb-4">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-sm text-gray-800">
                    {c.name_on_receipt}
                  </span>
                  {c.brand && (
                    <span className="ml-2 text-xs text-gray-500">
                      Brand: {c.brand}
                    </span>
                  )}
                  {c.amount && (
                    <span className="ml-2 text-xs text-gray-500">
                      Amount: {c.amount}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {c.price != null ? `€ ${Number(c.price).toFixed(2)}` : '—'}
                </span>
              </div>
              {c.items?.name && (
                <p className="text-xs text-gray-400 mt-1">
                  Item: {c.items.name}
                  {c.items.type ? ` (${c.items.type})` : ''}
                </p>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onAddNew}
            className="flex-1 py-2 px-4 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Add New Entry
          </button>
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
