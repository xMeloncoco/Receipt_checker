import EditableField from './EditableField.jsx';

export default function ReviewLine({
  index,
  line,
  onFieldChange,
  getFieldStatus,
  getOriginalValue,
  matchInfo,
  onOpenMatchSelector,
}) {
  const field = (name, type = 'text', small = true) => (
    <EditableField
      value={line[name]}
      onChange={(v) => onFieldChange(index, name, v)}
      type={type}
      status={getFieldStatus(index, name)}
      originalValue={getOriginalValue(index, name)}
      small={small}
    />
  );

  const isDiscount = line.price_per_item != null && Number(line.price_per_item) < 0;
  const lineStatus = matchInfo?.status; // 'new', 'matched', 'changed', 'multiple'

  // Row background based on overall line match status
  let rowBg = '';
  if (lineStatus === 'new') rowBg = 'bg-green-50/50';

  return (
    <div className={`border-b border-gray-200 py-3 ${rowBg}`}>
      {/* Main receipt line info */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        {/* Name */}
        <div className="flex-1 min-w-[180px] flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs">Name</span>
          <EditableField
            value={line.name_on_receipt}
            onChange={(v) => onFieldChange(index, 'name_on_receipt', v)}
            status={getFieldStatus(index, 'name_on_receipt')}
            originalValue={getOriginalValue(index, 'name_on_receipt')}
            className={`w-full ${isDiscount ? 'italic' : ''}`}
          />
        </div>

        {/* Quantity */}
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs">Qty</span>
          {field('quantity', 'number')}
        </div>

        {/* Price per item */}
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs">Price</span>
          {field('price_per_item', 'number')}
        </div>

        {/* Discount per item */}
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs">Disc</span>
          {field('discount_per_item', 'number')}
        </div>

        {/* Total discount */}
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs">Tot.Disc</span>
          {field('total_discount', 'number')}
        </div>

        {/* Price total */}
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs font-semibold">Total</span>
          {field('price_total', 'number')}
        </div>
      </div>

      {/* Item / Brand / Amount row — linked to items_per_store */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2 mt-2 ml-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs">Item</span>
          <EditableField
            value={line.item_name}
            onChange={(v) => onFieldChange(index, 'item_name', v)}
            status={getFieldStatus(index, 'item_name')}
            originalValue={getOriginalValue(index, 'item_name')}
            placeholder="e.g. Chicken"
            small
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs">Brand</span>
          {field('brand')}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-xs">Amount</span>
          {field('amount')}
        </div>

        {/* Match status indicator */}
        {lineStatus === 'new' && (
          <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded self-end">
            NEW
          </span>
        )}
        {lineStatus === 'multiple' && (
          <button
            onClick={() => onOpenMatchSelector(index)}
            className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded hover:bg-amber-200 transition-colors self-end"
          >
            {matchInfo.candidates.length} matches — choose
          </button>
        )}
        {/* Receipt line ID */}
        <div className="flex flex-col gap-0.5 ml-auto">
          <span className="text-gray-400 text-xs">Line #</span>
          {field('receipt_line_id')}
        </div>
      </div>
    </div>
  );
}
