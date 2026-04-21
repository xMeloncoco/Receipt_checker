import { useState } from 'react';
import Spinner from '../ui/Spinner.jsx';

function categoriseError(error) {
  if (!error) return 'unknown';
  if (error.includes('429') && error.toLowerCase().includes('too many requests')) return 'limit';
  if (error.includes('high demand') && error.toLowerCase().includes('temporary')) return 'busy';
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

export default function AttemptBox({ attempt }) {
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
