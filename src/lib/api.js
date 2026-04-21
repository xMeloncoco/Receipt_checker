/**
 * Send one or more receipt files to the backend for parsing in a single call.
 * The backend asks the AI to parse all images in one prompt and returns an
 * array of results (one per file, in the same order).
 *
 * @param {File[]} files - Receipt images / PDFs
 * @param {string} model - Model name to try (e.g. 'gemini-2.5-flash')
 * @returns {Promise<{results: Array, rawText: string}>}
 */
export async function parseReceipts(files, model) {
  const form = new FormData();
  for (const f of files) form.append('receipt', f);

  const url = model
    ? `/api/parse-receipt?model=${encodeURIComponent(model)}`
    : '/api/parse-receipt';

  const res = await fetch(url, { method: 'POST', body: form });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server error ${res.status}: ${text || '(empty response)'}`);
  }

  if (!res.ok) {
    const err = new Error(data.error || `Server error ${res.status}`);
    err.rawText = data.rawText;
    err.errorType = data.errorType || 'unknown';
    throw err;
  }

  return data;
}

/**
 * Save reviewed receipt data to the database.
 */
export async function saveReceipt(data, file) {
  const form = new FormData();
  form.append('data', JSON.stringify(data));
  if (file) form.append('receipt', file);

  const res = await fetch('/api/save-receipt', { method: 'POST', body: form });

  const text = await res.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Server error ${res.status}: ${text || '(empty response)'}`);
  }

  if (!res.ok) {
    const err = new Error(result.error || `Server error ${res.status}`);
    err.errorType = result.errorType;
    err.duplicateReceiptId = result.duplicateReceiptId;
    err.duplicateStoreName = result.duplicateStoreName;
    throw err;
  }

  return result;
}

/**
 * Re-check items_per_store for a given store name.
 * Used after editing fields to re-compare against DB.
 */
export async function checkItemsPerStore(storeName) {
  const res = await fetch('/api/check-items-per-store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ store_name: storeName }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server error ${res.status}: ${text || '(empty response)'}`);
  }

  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

  return data;
}
