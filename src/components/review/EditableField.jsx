import { useState } from 'react';

const STATUS_STYLES = {
  standard: 'border-gray-200 bg-white',
  green: 'border-green-400 bg-green-50',
  blue: 'border-blue-400 bg-blue-50',
  red: 'border-red-400 bg-red-50',
};

export default function EditableField({
  value,
  onChange,
  type = 'text',
  status = 'standard',
  originalValue,
  placeholder = '',
  className = '',
  small = false,
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleChange = (e) => {
    let val = e.target.value;
    if (type === 'number') {
      // Allow empty, minus, decimal — validated on blur
      if (val !== '' && val !== '-' && val !== '.' && val !== '-.' && isNaN(Number(val))) {
        return;
      }
    }
    onChange(val);
  };

  const handleBlur = (e) => {
    if (type === 'number' && e.target.value !== '') {
      const num = Number(e.target.value);
      if (!isNaN(num)) {
        onChange(String(num));
      }
    }
  };

  const baseClass = `border rounded px-2 py-1 text-sm outline-none transition-colors focus:ring-1 focus:ring-indigo-300 ${STATUS_STYLES[status] || STATUS_STYLES.standard}`;
  const sizeClass = small ? 'w-20' : 'w-full';

  return (
    <div className={`relative inline-flex items-center gap-1 ${className}`}>
      <input
        type="text"
        inputMode={type === 'number' ? 'decimal' : 'text'}
        value={value ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${baseClass} ${sizeClass}`}
      />
      {status === 'blue' && originalValue != null && (
        <span
          className="relative cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
            !
          </span>
          {showTooltip && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
              DB: {originalValue}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
