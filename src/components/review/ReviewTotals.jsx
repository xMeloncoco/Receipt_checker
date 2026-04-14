import EditableField from './EditableField.jsx';

export default function ReviewTotals({
  formData,
  onFieldChange,
  getFieldStatus,
  getOriginalValue,
}) {
  return (
    <div className="border-t-2 border-gray-300 pt-4 mt-4 space-y-2">
      <div className="flex items-center justify-end gap-2">
        <span className="text-gray-500 text-sm">Subtotal (before discount):</span>
        <EditableField
          value={formData.total_without_discount}
          onChange={(v) => onFieldChange('total_without_discount', v)}
          type="number"
          status={getFieldStatus('total_without_discount')}
          originalValue={getOriginalValue('total_without_discount')}
          placeholder="—"
          small
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="text-gray-700 text-sm font-bold">Total (paid):</span>
        <EditableField
          value={formData.total_with_discount}
          onChange={(v) => onFieldChange('total_with_discount', v)}
          type="number"
          status={getFieldStatus('total_with_discount')}
          originalValue={getOriginalValue('total_with_discount')}
          placeholder="0.00"
          small
        />
      </div>
    </div>
  );
}
