import { SYSTEM_INSTRUCTION } from './gemini.js';

/**
 * Parse a receipt image using DeepSeek's OpenAI-compatible API.
 *
 * When `vision` is false the image content block is stripped and only the text
 * prompt is sent — required for text-only DeepSeek variants that reject
 * image_url parts outright.
 *
 * @param {Buffer} fileBuffer
 * @param {string} mimeType
 * @param {{ vision?: boolean, model?: string }} config
 * @returns {Promise<{parsed: object, rawText: string}>}
 */
export async function parseReceiptDeepseek(fileBuffer, mimeType, config = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set — check your .env file');

  const vision = config.vision ?? true;
  const model = config.model ?? 'deepseek-vl2';

  const userContent = [{ type: 'text', text: 'Parse this receipt.' }];
  if (vision) {
    const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    userContent.unshift({ type: 'image_url', image_url: { url: dataUrl } });
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
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

  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    const error = new Error('DeepSeek returned non-JSON output');
    error.rawText = rawText;
    throw error;
  }

  return { parsed, rawText };
}
