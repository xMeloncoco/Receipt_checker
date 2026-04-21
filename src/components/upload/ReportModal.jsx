export default function ReportModal({ attempts, onClose }) {
  const failed = attempts.filter((a) => a.status === 'failed');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Model Failure Report</h3>
        {failed.length === 0 ? (
          <p className="text-sm text-gray-500">No failed attempts recorded.</p>
        ) : (
          <div className="space-y-3">
            {failed.map((a) => (
              <div
                key={a.model}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="font-semibold text-sm text-gray-800">{a.model}</p>
                <p className="mt-1 text-xs text-gray-500 whitespace-pre-wrap break-all">
                  {a.error}
                </p>
              </div>
            ))}
          </div>
        )}
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
