/**
 * Send a receipt file to the backend for parsing.
 * The backend streams NDJSON events as it tries each model in the fallback chain.
 *
 * @param {File}     file     - The receipt image / PDF
 * @param {function} onEvent  - Called for each streamed event object
 * @returns {Promise<void>}   - Resolves when the stream ends
 */
export async function parseReceiptStream(file, onEvent) {
  const form = new FormData();
  form.append('receipt', file);

  const res = await fetch('/api/parse-receipt', {
    method: 'POST',
    body: form,
  });

  if (!res.ok && !res.body) {
    throw new Error(`Server error ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep any incomplete trailing line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        onEvent(JSON.parse(line));
      } catch {
        // skip malformed lines
      }
    }
  }

  // Flush remaining buffer
  if (buffer.trim()) {
    try {
      onEvent(JSON.parse(buffer));
    } catch {
      // skip
    }
  }
}
