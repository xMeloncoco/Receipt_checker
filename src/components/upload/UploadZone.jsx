import { useState, useRef, useCallback } from 'react';
import { parseReceipt } from '../../lib/api.js';
import Spinner from '../ui/Spinner.jsx';

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ACCEPTED_EXT = '.jpg,.jpeg,.png,.webp,.pdf';

export default function UploadZone({ onResult }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!ACCEPTED_MIME.includes(f.type)) {
      setError('Unsupported file type. Please upload a JPEG, PNG, WebP, or PDF.');
      return;
    }
    setError(null);
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const onInputChange = (e) => handleFile(e.target.files[0]);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await parseReceipt(file);
      onResult(result);
    } catch (err) {
      setError(err.message || 'Failed to process receipt.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !file && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
          ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'}
          ${file ? 'cursor-default' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXT}
          onChange={onInputChange}
          className="hidden"
        />

        {!file && (
          <div className="space-y-2">
            <div className="text-4xl">📄</div>
            <p className="text-gray-600 font-medium">Drop your receipt here or click to browse</p>
            <p className="text-gray-400 text-sm">JPEG, PNG, WebP or PDF — max 10 MB</p>
          </div>
        )}

        {file && (
          <div className="flex flex-col items-center gap-3">
            {preview ? (
              <img
                src={preview}
                alt="Receipt preview"
                className="max-h-64 rounded shadow object-contain"
              />
            ) : (
              <div className="text-5xl">📄</div>
            )}
            <p className="text-gray-700 font-medium text-sm">{file.name}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="text-xs text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-4 py-2">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!file || loading}
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg
          bg-indigo-600 text-white font-semibold text-sm
          hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Spinner size="sm" className="text-white" />
            Processing receipt...
          </>
        ) : (
          'Process Receipt'
        )}
      </button>
    </div>
  );
}
