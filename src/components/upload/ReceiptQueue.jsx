import { useEffect, useRef, useState } from 'react';
import ReceiptReview from '../review/ReceiptReview.jsx';
import AttemptBox from './AttemptBox.jsx';
import ReportModal from './ReportModal.jsx';
import DuplicateNotice from '../review/DuplicateNotice.jsx';
import { parseWithFallback } from '../../lib/parseWithFallback.js';

const STATUS_LABEL = {
  saved: { text: 'Saved', classes: 'bg-green-100 text-green-800' },
  duplicate: { text: 'Duplicate — skipped', classes: 'bg-amber-100 text-amber-800' },
  skipped: { text: 'Skipped', classes: 'bg-gray-100 text-gray-700' },
};

function QueueSidebar({ files, currentIndex, outcomes, phase }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Queue ({Math.min(currentIndex, files.length)}/{files.length})
      </h3>
      <ol className="space-y-1">
        {files.map((f, i) => {
          const outcome = outcomes[i];
          const isCurrent = i === currentIndex && phase === 'reviewing';
          const done = outcome != null;
          const label = outcome ? STATUS_LABEL[outcome.status] : null;

          return (
            <li
              key={i}
              className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm ${
                isCurrent ? 'bg-indigo-50 border border-indigo-200' : ''
              } ${done ? 'text-gray-500' : 'text-gray-800'}`}
            >
              <span className="truncate" title={f.name}>
                {i + 1}. {f.name}
              </span>
              {label && (
                <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${label.classes}`}>
                  {label.text}
                </span>
              )}
              {isCurrent && !done && (
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 shrink-0">
                  Reviewing
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function ReceiptQueue({ files, onDone }) {
  // phase: 'parsing' | 'failed' | 'reviewing' | 'finished'
  const [phase, setPhase] = useState('parsing');
  const [attempts, setAttempts] = useState([]);
  const [parseResults, setParseResults] = useState([]);
  const [fatalError, setFatalError] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [outcomes, setOutcomes] = useState(() => files.map(() => null));
  const startedRef = useRef(false);

  // Single parse call for all files (one prompt to the model).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const outcome = await parseWithFallback(files, setAttempts);
      if (outcome.data) {
        setParseResults(outcome.data.results || []);
        setPhase('reviewing');
      } else {
        setFatalError(outcome.fatalError || null);
        setPhase('failed');
      }
    })();
  }, [files]);

  const advance = (status) => {
    const nextIndex = currentIndex + 1;
    setOutcomes((prev) => {
      const next = [...prev];
      next[currentIndex] = { status };
      return next;
    });
    setCurrentIndex(nextIndex);
    if (nextIndex >= files.length) setPhase('finished');
  };

  // ── Parsing phase ───────────────────────────────────────────────────────
  if (phase === 'parsing') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-500">
          Sending {files.length} receipt{files.length > 1 ? 's' : ''} to the AI…
        </p>
        {attempts.map((a) => (
          <AttemptBox key={a.model} attempt={a} />
        ))}
      </div>
    );
  }

  // ── Parsing failed on every model OR fatal app error ────────────────────
  if (phase === 'failed') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {attempts.map((a) => (
            <AttemptBox key={a.model} attempt={a} />
          ))}
        </div>

        {fatalError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 space-y-2">
            <p className="text-red-700 text-sm font-semibold">
              The model parsed the images but saving the result failed
            </p>
            <p className="text-red-600 text-sm whitespace-pre-wrap">{fatalError}</p>
          </div>
        ) : (
          <div className="text-center space-y-3 py-2">
            <p className="text-red-700 font-semibold text-sm">
              All models failed to process the receipts.
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

        <button
          onClick={onDone}
          className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Start over
        </button>

        {showReport && (
          <ReportModal attempts={attempts} onClose={() => setShowReport(false)} />
        )}
      </div>
    );
  }

  // ── Finished queue ──────────────────────────────────────────────────────
  if (phase === 'finished') {
    const counts = outcomes.reduce((acc, o) => {
      if (o) acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-8 py-6 max-w-md w-full text-center">
          <div className="text-4xl mb-3">&#10003;</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">All receipts processed</h2>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {Object.entries(counts).map(([status, count]) => {
              const lbl = STATUS_LABEL[status];
              return (
                <span
                  key={status}
                  className={`text-xs px-2 py-0.5 rounded ${
                    lbl?.classes || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {lbl?.text || status}: {count}
                </span>
              );
            })}
          </div>
        </div>
        <button
          onClick={onDone}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Upload more receipts
        </button>
      </div>
    );
  }

  // ── Reviewing one parsed receipt at a time ──────────────────────────────
  // Safety net: advance() should have flipped phase to 'finished', but if a
  // render slips through with currentIndex out of range, render nothing
  // instead of crashing.
  if (currentIndex >= files.length) return null;

  const current = parseResults[currentIndex];
  const currentFile = files[currentIndex];
  const continueLabel =
    currentIndex + 1 < files.length ? 'Continue to next receipt' : 'Finish';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Receipt {currentIndex + 1} of {files.length} — {currentFile.name}
        </p>

        {current?.isDuplicate ? (
          <DuplicateNotice
            receiptId={current.duplicateReceiptId}
            storeName={current.duplicateStoreName}
            onBack={() => advance('duplicate')}
            continueLabel={continueLabel}
          />
        ) : current ? (
          <ReceiptReview
            key={currentIndex}
            parsedData={current.parsed}
            rawText={null}
            file={currentFile}
            store={current.store}
            itemsPerStore={current.itemsPerStore}
            onReset={() => advance('skipped')}
            onSaved={() => advance('saved')}
            continueLabel={continueLabel}
          />
        ) : (
          <p className="text-sm text-red-600">No parse result for this file.</p>
        )}
      </div>

      <QueueSidebar
        files={files}
        currentIndex={currentIndex}
        outcomes={outcomes}
        phase={phase}
      />
    </div>
  );
}
