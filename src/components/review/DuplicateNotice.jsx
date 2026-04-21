export default function DuplicateNotice({
  receiptId,
  storeName,
  onBack,
  continueLabel = 'Go Back',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="bg-amber-50 border border-amber-300 rounded-xl px-8 py-6 max-w-md text-center">
        <div className="text-4xl mb-3">&#9888;</div>
        <h2 className="text-lg font-bold text-amber-800 mb-2">
          Receipt Already Processed
        </h2>
        <p className="text-amber-700 text-sm">
          A receipt with the same date, time, and total already exists
          {storeName ? (
            <>
              {' '}under store <strong>{storeName}</strong>
            </>
          ) : null}
          .
        </p>
        {receiptId && (
          <p className="text-amber-600 text-xs mt-2 font-mono break-all">
            Existing ID: {receiptId}
          </p>
        )}
      </div>
      <button
        onClick={onBack}
        className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
      >
        {continueLabel}
      </button>
    </div>
  );
}
