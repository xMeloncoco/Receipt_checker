import { parseReceipts } from './api.js';

export const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'deepseek',
];

/**
 * Send all files in a single call, try each model in order. onAttempt is
 * invoked with the full attempt list every time a status changes so the caller
 * can render per-model progress.
 *
 * Returns either { data, attempts } on success or { attempts, fatalError? } on
 * failure. When every model fails, fatalError is unset and the caller should
 * offer a Report.
 */
export async function parseWithFallback(files, onAttempt) {
  const attempts = [];

  const updateAttempt = (model, patch) => {
    const existing = attempts.find((a) => a.model === model);
    if (existing) Object.assign(existing, patch);
    else attempts.push({ model, ...patch });
    onAttempt?.([...attempts]);
  };

  for (const model of MODELS) {
    updateAttempt(model, { status: 'attempting' });

    try {
      const data = await parseReceipts(files, model);
      updateAttempt(model, { status: 'success' });
      return { data, attempts: [...attempts] };
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';

      if (err.errorType === 'app_error') {
        updateAttempt(model, { status: 'failed', error: errorMsg });
        return {
          fatalError: `The model parsed the receipts successfully, but an internal error occurred: ${errorMsg}`,
          attempts: [...attempts],
        };
      }

      updateAttempt(model, { status: 'failed', error: errorMsg });
    }
  }

  return { attempts: [...attempts] };
}
