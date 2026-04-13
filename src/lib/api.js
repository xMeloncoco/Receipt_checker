/**
 * Send a receipt file to the backend for parsing with a specific model.
 *
 * @param {File}   file  - The receipt image / PDF
 * @param {string} model - Model name to try (e.g. 'gemini-2.5-flash')
 * @returns {Promise<object>} Parse result from the server
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

  // Read as text first — the body may be empty or non-JSON on server crashes
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
    throw err;
  }

  return data;
}
