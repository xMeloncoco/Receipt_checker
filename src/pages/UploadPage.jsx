import { useState } from 'react';
import UploadZone from '../components/upload/UploadZone.jsx';
import ReceiptReview from '../components/review/ReceiptReview.jsx';
import DuplicateNotice from '../components/review/DuplicateNotice.jsx';

export default function UploadPage() {
  const [result, setResult] = useState(null);

  const handleResult = (data) => {
    setResult(data);
  };

  const handleReset = () => {
    setResult(null);
  };

  // Duplicate receipt
  if (result?.isDuplicate) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Upload Receipt</h1>
        <DuplicateNotice
          receiptId={result.duplicateReceiptId}
          onBack={handleReset}
        />
      </div>
    );
  }

  // Review screen
  if (result?.parsed) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Review Receipt</h1>
          <button
            onClick={handleReset}
            className="text-sm text-indigo-600 hover:underline"
          >
            Upload another
          </button>
        </div>
        <ReceiptReview
          parsedData={result.parsed}
          rawText={result.rawText}
          file={result.file}
          store={result.store}
          itemsPerStore={result.itemsPerStore}
          onReset={handleReset}
        />
      </div>
    );
  }

  // Upload screen
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Upload Receipt</h1>
      <UploadZone onResult={handleResult} />
    </div>
  );
}
