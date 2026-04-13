/**
 * Send a receipt file to the backend for parsing.
 * @param {File} file
 * @returns {Promise<object>} Parse result from the server
 */
export async function parseReceipt(file) {
  const form = new FormData();
  form.append('receipt', file);

  const res = await fetch('/api/parse-receipt', {
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
