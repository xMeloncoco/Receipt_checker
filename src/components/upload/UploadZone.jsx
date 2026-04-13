import { useState, useRef, useCallback } from 'react';
import { parseReceiptStream } from '../../lib/api.js';
import Spinner from '../ui/Spinner.jsx';

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ACCEPTED_EXT = '.jpg,.jpeg,.png,.webp,.pdf';

// ─── Error categorisation ────────────────────────────────────────────────────
function categoriseError(error) {
  if (!error) return 'unknown';
  if (error.includes('429') && error.toLowerCase().includes('too many requests'))
    return 'limit';
  if (
    error.includes('high demand') &&
    error.toLowerCase().includes('temporary')
  )
    return 'busy';
  return 'unknown';
}

function ErrorLabel({ error }) {
  const cat = categoriseError(error);
  const [expanded, setExpanded] = useState(false);

  if (cat === 'limit') return <span className="text-red-600 text-sm">Max limit reached</span>;
  if (cat === 'busy') return <span className="text-red-600 text-sm">Model busy</span>;

  return (
    <span className="text-red-600 text-sm">
      Unknown reason
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="ml-2 text-xs text-red-400 underline hover:text-red-600"
      >
        {expanded ? 'hide' : 'details'}
      </button>
      {expanded && (
        <span className="block mt-1 text-xs text-red-400 whitespace-pre-wrap break-all">
          {error}
        </span>
      )}
    </span>
  );
}

// ─── Single attempt row ──────────────────────────────────────────────────────
function AttemptBox({ attempt }) {
  if (attempt.status === 'attempting') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Spinner size="sm" className="text-blue-500" />
        <span className="text-sm text-blue-700">
          Sending image to <strong>{attempt.model}</strong>
        </span>
      </div>
    );
  }

  if (attempt.status === 'failed') {
    return (
      <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span className="font-semibold text-sm text-red-700">{attempt.model}</span>
          <span className="text-red-300">—</span>
          <ErrorLabel error={attempt.error} />
        </div>
      </div>
    );
  }

  if (attempt.status === 'success') {
    return (
      <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <span className="font-semibold text-sm text-green-700">{attempt.model}</span>
          <span className="text-green-300">—</span>
          <span className="text-green-600 text-sm">Success</span>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Report modal ────────────────────────────────────────────────────────────
function ReportModal({ attempts, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Model Failure Report</h3>
        <div className="space-y-3">
          {attempts.map((a) => (
            <div key={a.model} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="font-semibold text-sm text-gray-800">{a.model}</p>
              <p className="mt-1 text-xs text-gray-500 whitespace-pre-wrap break-all">
                {a.error}
              </p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2 px-4 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function UploadZone({ onResult }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [allFailed, setAllFailed] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState([]);
  const [processResult, setProcessResult] = useState(null);
  const [fatalError, setFatalError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!ACCEPTED_MIME.includes(f.type)) {
      setFatalError('Unsupported file type. Please upload a JPEG, PNG, WebP, or PDF.');
      return;
    }
    setFatalError(null);
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onInputChange = (e) => handleFile(e.target.files[0]);

  // ── Process receipt with model fallback chain ─────────────────────────────
  const handleSubmit = async () => {
    if (!file) return;
    setProcessing(true);
    setAttempts([]);
    setAllFailed(false);
    setFailedAttempts([]);
    setProcessResult(null);
    setFatalError(null);

    try {
      await parseReceiptStream(file, (event) => {
        switch (event.type) {
          case 'attempting':
            setAttempts((prev) => [...prev, { model: event.model, status: 'attempting' }]);
            break;

          case 'failed':
            setAttempts((prev) =>
              prev.map((a) =>
                a.model === event.model
                  ? { ...a, status: 'failed', error: event.error }
                  : a,
              ),
            );
            break;

          case 'success':
            setAttempts((prev) =>
              prev.map((a) =>
                a.model === event.model ? { ...a, status: 'success' } : a,
              ),
            );
            break;

          case 'result':
            setProcessResult(event.data);
            break;

          case 'all_failed':
            setAllFailed(true);
            setFailedAttempts(event.attempts || []);
            break;

          case 'error':
            setFatalError(event.error || 'An unexpected error occurred while saving the receipt.');
            break;
        }
      });
    } catch (err) {
      setFatalError(err.message || 'Failed to connect to server.');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setFatalError(null);
    setAttempts([]);
    setAllFailed(false);
    setFailedAttempts([]);
    setProcessResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const hasStarted = attempts.length > 0;
  const succeeded = processResult !== null;

  return (
    <div className="space-y-4">
      {/* ── Drop zone ──────────────────────────────────────────────────────── */}
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
            {!processing && !succeeded && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Model attempt status boxes ─────────────────────────────────────── */}
      {hasStarted && (
        <div className="space-y-2">
          {attempts.map((attempt) => (
            <AttemptBox key={attempt.model} attempt={attempt} />
          ))}
        </div>
      )}

      {/* ── All models failed ──────────────────────────────────────────────── */}
      {allFailed && (
        <div className="text-center space-y-3 py-2">
          <p className="text-red-700 font-semibold text-sm">
            All models failed to process the receipt.
          </p>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Report
          </button>
        </div>
      )}

      {/* ── Fatal / DB error ───────────────────────────────────────────────── */}
      {fatalError && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-4 py-2">
          {fatalError}
        </p>
      )}

      {/* ── Action button ──────────────────────────────────────────────────── */}
      {succeeded ? (
        <button
          type="button"
          onClick={() => onResult(processResult)}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg
            bg-green-600 text-white font-semibold text-sm
            hover:bg-green-700 transition-colors"
        >
          Check Receipt
        </button>
      ) : (
        <button
          type="button"
          disabled={!file || processing}
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg
            bg-indigo-600 text-white font-semibold text-sm
            hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {processing ? (
            <>
              <Spinner size="sm" className="text-white" />
              Processing…
            </>
          ) : (
            'Process Receipt'
          )}
        </button>
      )}

      {/* ── Report modal ───────────────────────────────────────────────────── */}
      {showReport && (
        <ReportModal
          attempts={failedAttempts.length > 0 ? failedAttempts : attempts.filter((a) => a.status === 'failed')}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
