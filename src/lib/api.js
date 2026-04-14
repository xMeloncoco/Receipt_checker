/**
 * Send a receipt file to the backend for parsing with a specific model.
 * Parse-only — does NOT save to the database.
 *
 * @param {File}   file  - The receipt image / PDF
 * @param {string} model - Model name to try (e.g. 'gemini-2.5-flash')
 * @returns {Promise<object>} Parse result: { parsed, rawText, store, isDuplicate, duplicateReceiptId, itemsPerStore }
 */
export async function parseReceipt(file, model) {
  const form = new FormData();
  form.append('receipt', file);

  const url = model
    ? `/api/parse-receipt?model=${encodeURIComponent(model)}`
    : '/api/parse-receipt';

  const res = await fetch(url, {
    method: 'POST',
    body: form,
  });

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
 *
 * @param {object} data - The reviewed receipt data (store_name, lines, totals, etc.)
 * @param {File}   file - The receipt image / PDF file
 * @returns {Promise<object>} Save result: { success, receipt, store, lines }
 */
export async function saveReceipt(data, file) {
  const form = new FormData();
  form.append('data', JSON.stringify(data));
  if (file) {
    form.append('receipt', file);
  }

  const res = await fetch('/api/save-receipt', {
    method: 'POST',
    body: form,
  });

  const text = await res.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Server error ${res.status}: ${text || '(empty response)'}`);
  }

  if (!res.ok) {
    throw new Error(result.error || `Server error ${res.status}`);
  }

  return result;
}

/**
 * Re-check items_per_store for a given store name.
 * Used after editing fields to re-compare against DB.
 *
 * @param {string} storeName - The store name to look up
 * @returns {Promise<object>} { store, itemsPerStore }
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

  if (!res.ok) {
    throw new Error(data.error || `Server error ${res.status}`);
  }

  return data;
}
