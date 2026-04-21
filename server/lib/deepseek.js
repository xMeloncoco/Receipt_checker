import { SYSTEM_INSTRUCTION, parseArrayOutput } from './gemini.js';

/**
 * Parse one or more receipt images via an OpenAI-compatible chat endpoint.
 *
 * DeepSeek's own `api.deepseek.com/chat/completions` only accepts text
 * parts — it returns 400 "unknown variant image_url" when images are
 * attached.  To get a DeepSeek model that accepts images we route through
 * an OpenAI-compatible host (OpenRouter by default) that proxies to
 * `deepseek-vl2`.
 *
 * All three pieces are env-configurable so you can swap provider without a
 * code change:
 *   DEEPSEEK_BASE_URL  (default: https://openrouter.ai/api/v1)
 *   DEEPSEEK_API_KEY   (required)
 *   DEEPSEEK_MODEL     (default: deepseek/deepseek-vl2)
 */
export async function parseReceiptsDeepseek(files, config = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set — check your .env file');

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
  const model = config.model ?? process.env.DEEPSEEK_MODEL ?? 'deepseek/deepseek-vl2';
  const vision = config.vision ?? true;

  const userContent = [];
  if (vision) {
    for (const f of files) {
      const dataUrl = `data:${f.mimeType};base64,${f.buffer.toString('base64')}`;
      userContent.push({ type: 'image_url', image_url: { url: dataUrl } });
    }
  }
  userContent.push({
    type: 'text',
    text:
      files.length === 1
        ? 'Parse this receipt. Return a JSON array with one element.'
        : `Parse these ${files.length} receipts. Return a JSON array with ${files.length} elements, one per image in the same order.`,
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
  // OpenRouter recommends (but does not require) these attribution
  // headers.  Harmless on other providers.
  if (baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = process.env.OPENROUTER_REFERER || 'https://github.com/xMeloncoco/Receipt_checker';
    headers['X-Title'] = 'Receipt Checker';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: userContent },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content?.trim();

  if (!rawText) throw new Error('DeepSeek returned empty response');

  return parseArrayOutput(rawText);
}
