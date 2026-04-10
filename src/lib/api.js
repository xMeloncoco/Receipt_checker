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

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || 'Upload failed');
    err.rawText = data.rawText;
    throw err;
  }

  return data;
}
