import { useState, useEffect, useRef } from 'react';
import ReceiptReview from '../review/ReceiptReview.jsx';
import AttemptBox from './AttemptBox.jsx';
import DuplicateNotice from '../review/DuplicateNotice.jsx';
import { parseWithFallback } from '../../lib/parseWithFallback.js';

const STATUS_LABEL = {
  saved: { text: 'Saved', classes: 'bg-green-100 text-green-800' },
  duplicate: { text: 'Duplicate — skipped', classes: 'bg-amber-100 text-amber-800' },
  failed: { text: 'Failed', classes: 'bg-red-100 text-red-800' },
  skipped: { text: 'Skipped', classes: 'bg-gray-100 text-gray-700' },
};

function QueueSidebar({ files, currentIndex, outcomes }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Queue ({currentIndex}/{files.length})
      </h3>
      <ol className="space-y-1">
        {files.map((f, i) => {
          const outcome = outcomes[i];
          const isCurrent = i === currentIndex;
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
                  Processing
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('parsing'); // 'parsing' | 'review' | 'duplicate' | 'failed' | 'finished'
  const [attempts, setAttempts] = useState([]);
  const [parseResult, setParseResult] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [outcomes, setOutcomes] = useState(() => files.map(() => null));
  const parseTokenRef = useRef(0);

  const currentFile = files[currentIndex];
  const isLast = currentIndex >= files.length;

  // Kick off parsing when index changes
  useEffect(() => {
    if (isLast) {
      setPhase('finished');
      return;
    }

    const token = ++parseTokenRef.current;
    setPhase('parsing');
    setAttempts([]);
    setParseResult(null);
    setParseError(null);

    (async () => {
      const outcome = await parseWithFallback(files[currentIndex], (a) => {
        if (parseTokenRef.current !== token) return;
        setAttempts(a);
      });

      if (parseTokenRef.current !== token) return;

      if (outcome.result) {
        setParseResult({ ...outcome.result, file: files[currentIndex] });
        if (outcome.result.isDuplicate) {
          setPhase('duplicate');
        } else {
          setPhase('review');
        }
      } else if (outcome.fatalError) {
        setParseError(outcome.fatalError);
        setPhase('failed');
      } else {
        setParseError('All models failed to process this receipt.');
        setPhase('failed');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, files]);

  const recordOutcome = (status) => {
    setOutcomes((prev) => {
      const next = [...prev];
      next[currentIndex] = { status };
      return next;
    });
  };

  const advance = (status) => {
    recordOutcome(status);
    setCurrentIndex((i) => i + 1);
  };

  // Final summary screen
  if (phase === 'finished') {
    const counts = outcomes.reduce(
      (acc, o) => {
        if (o) acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      },
      {},
    );
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
                  className={`text-xs px-2 py-0.5 rounded ${lbl?.classes || 'bg-gray-100 text-gray-700'}`}
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

  const progressLabel = `Receipt ${currentIndex + 1} of ${files.length} — ${currentFile.name}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">{progressLabel}</p>

        {phase === 'parsing' && (
          <div className="space-y-2">
            {attempts.map((a) => (
              <AttemptBox key={a.model} attempt={a} />
            ))}
          </div>
        )}

        {phase === 'failed' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {attempts.map((a) => (
                <AttemptBox key={a.model} attempt={a} />
              ))}
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4">
              <p className="text-red-700 text-sm font-semibold mb-2">
                Could not process this receipt
              </p>
              <p className="text-red-600 text-sm">{parseError}</p>
            </div>
            <button
              onClick={() => advance('failed')}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              {currentIndex + 1 < files.length ? 'Skip to next receipt' : 'Finish'}
            </button>
          </div>
        )}

        {phase === 'duplicate' && parseResult && (
          <div className="space-y-4">
            <DuplicateNotice
              receiptId={parseResult.duplicateReceiptId}
              onBack={() => advance('duplicate')}
            />
          </div>
        )}

        {phase === 'review' && parseResult && (
          <ReceiptReview
            key={currentIndex}
            parsedData={parseResult.parsed}
            rawText={parseResult.rawText}
            file={parseResult.file}
            store={parseResult.store}
            itemsPerStore={parseResult.itemsPerStore}
            onReset={() => advance('skipped')}
            onSaved={() => advance('saved')}
            continueLabel={
              currentIndex + 1 < files.length ? 'Continue to next receipt' : 'Finish'
            }
          />
        )}
      </div>

      <QueueSidebar
        files={files}
        currentIndex={currentIndex}
        outcomes={outcomes}
      />
    </div>
  );
}
