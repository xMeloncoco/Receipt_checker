import { parseReceipt } from './api.js';

export const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'deepseek',
];

/**
 * Try each model in order. onAttempt is called for every status change so the
 * caller can render per-model progress. Returns either { result } on success
 * (stops at the first model that works) or { allFailed, attempts, fatalError }.
 */
export async function parseWithFallback(file, onAttempt) {
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
      const result = await parseReceipt(file, model);
      updateAttempt(model, { status: 'success' });
      return { result, attempts: [...attempts] };
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';

      if (err.errorType === 'app_error') {
        updateAttempt(model, { status: 'failed', error: errorMsg });
        return {
          fatalError: `The model parsed the receipt successfully, but an internal error occurred: ${errorMsg}`,
          attempts: [...attempts],
        };
      }

      updateAttempt(model, { status: 'failed', error: errorMsg });
    }
  }

  return { allFailed: true, attempts: [...attempts] };
}
