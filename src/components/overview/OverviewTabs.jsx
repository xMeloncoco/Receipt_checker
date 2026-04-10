import { useState } from 'react';
import ReceiptTab from './ReceiptTab.jsx';
import ReceiptLinesTab from './ReceiptLinesTab.jsx';
import StoreItemsTab from './StoreItemsTab.jsx';
import GroceryItemsTab from './GroceryItemsTab.jsx';

const TABS = [
  { id: 'receipt', label: 'Receipt' },
  { id: 'lines', label: 'Receipt Lines' },
  { id: 'store-items', label: 'Store Items' },
  { id: 'grocery-items', label: 'Grocery Items' },
];

export default function OverviewTabs({ result }) {
  const [active, setActive] = useState('lines');
  const { is_duplicate, receipt, store, lines, existing_receipt_id } = result;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors -mb-px
              ${active === tab.id
                ? 'border border-b-white border-gray-200 text-indigo-700 bg-white'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
            {tab.id === 'lines' && lines?.length > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
                {lines.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-48">
        {active === 'receipt' && (
          <ReceiptTab
            receipt={receipt}
            store={store}
            isDuplicate={is_duplicate}
            existingReceiptId={existing_receipt_id}
          />
        )}
        {active === 'lines' && (
          <ReceiptLinesTab lines={lines ?? []} />
        )}
        {active === 'store-items' && (
          <StoreItemsTab storeId={store?.id} />
        )}
        {active === 'grocery-items' && (
          <GroceryItemsTab />
        )}
      </div>
    </div>
  );
}
