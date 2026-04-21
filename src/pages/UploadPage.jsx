import { useState } from 'react';
import UploadZone from '../components/upload/UploadZone.jsx';
import ReceiptQueue from '../components/upload/ReceiptQueue.jsx';

export default function UploadPage() {
  const [files, setFiles] = useState(null);

  const reset = () => setFiles(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {files ? 'Review Receipts' : 'Upload Receipts'}
        </h1>
        {files && (
          <button
            onClick={reset}
            className="text-sm text-indigo-600 hover:underline"
          >
            Start over
          </button>
        )}
      </div>

      {files ? (
        <ReceiptQueue files={files} onDone={reset} />
      ) : (
        <UploadZone onFiles={setFiles} />
      )}
    </div>
  );
}
