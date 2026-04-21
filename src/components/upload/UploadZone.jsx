import { useState, useRef, useCallback } from 'react';

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ACCEPTED_EXT = '.jpg,.jpeg,.png,.webp,.pdf';

export default function UploadZone({ onFiles }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const addFiles = useCallback((incoming) => {
    const accepted = [];
    const rejected = [];
    for (const f of incoming) {
      if (ACCEPTED_MIME.includes(f.type)) accepted.push(f);
      else rejected.push(f.name);
    }
    setError(
      rejected.length > 0
        ? `Skipped unsupported file(s): ${rejected.join(', ')}`
        : null,
    );
    setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      addFiles(Array.from(e.dataTransfer.files || []));
    },
    [addFiles],
  );

  const onInputChange = (e) => {
    addFiles(Array.from(e.target.files || []));
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStart = () => {
    if (files.length === 0) return;
    onFiles(files);
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
          ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXT}
          onChange={onInputChange}
          className="hidden"
        />
        <div className="space-y-2">
          <div className="text-4xl">&#128196;</div>
          <p className="text-gray-600 font-medium">
            Drop your receipts here or click to browse
          </p>
          <p className="text-gray-400 text-sm">
            JPEG, PNG, WebP or PDF — up to 10 MB each. Multiple files allowed.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-4 py-2">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-3 px-4 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl shrink-0">
                  {f.type === 'application/pdf' ? '\u{1F4C4}' : '\u{1F5BC}'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{f.name}</p>
                  <p className="text-xs text-gray-400">
                    {(f.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="text-xs text-red-500 hover:underline shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={files.length === 0}
        onClick={handleStart}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg
          bg-indigo-600 text-white font-semibold text-sm
          hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {files.length === 0
          ? 'Select at least one receipt'
          : `Process ${files.length} receipt${files.length > 1 ? 's' : ''}`}
      </button>
    </div>
  );
}
