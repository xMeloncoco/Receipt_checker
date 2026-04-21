import EditableField from './EditableField.jsx';

export default function ReviewHeader({
  formData,
  onFieldChange,
  getFieldStatus,
  getOriginalValue,
}) {
  return (
    <div className="border-b border-gray-300 pb-4 mb-4">
      {/* Store name */}
      <div className="text-center mb-3">
        <EditableField
          value={formData.store_name}
          onChange={(v) => onFieldChange('store_name', v)}
          status={getFieldStatus('store_name')}
          originalValue={getOriginalValue('store_name')}
          placeholder="Store name"
          className="justify-center"
        />
      </div>

      {/* Date, Time */}
      <div className="flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Date:</span>
          <EditableField
            value={formData.purchase_date}
            onChange={(v) => onFieldChange('purchase_date', v)}
            status={getFieldStatus('purchase_date')}
            originalValue={getOriginalValue('purchase_date')}
            placeholder="YYYY-MM-DD"
            small
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Time:</span>
          <EditableField
            value={formData.purchase_time}
            onChange={(v) => onFieldChange('purchase_time', v)}
            status={getFieldStatus('purchase_time')}
            originalValue={getOriginalValue('purchase_time')}
            placeholder="HH:MM"
            small
          />
        </div>
      </div>
    </div>
  );
}
