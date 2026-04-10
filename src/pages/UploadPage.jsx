import { useState } from 'react';
import UploadZone from '../components/upload/UploadZone.jsx';
import OverviewTabs from '../components/overview/OverviewTabs.jsx';

export default function UploadPage() {
  const [result, setResult] = useState(null);

  const handleResult = (data) => {
    setResult(data);
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Upload Receipt</h1>
        {result && (
          <button
            onClick={handleReset}
            className="text-sm text-indigo-600 hover:underline"
          >
            Upload another
          </button>
        )}
      </div>

      {!result ? (
        <UploadZone onResult={handleResult} />
      ) : (
        <OverviewTabs result={result} />
      )}
    </div>
  );
}
