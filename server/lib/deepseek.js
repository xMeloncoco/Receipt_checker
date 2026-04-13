import { SYSTEM_INSTRUCTION } from './gemini.js';

/**
 * Parse a receipt image using DeepSeek's OpenAI-compatible API.
 *
 * @param {Buffer} fileBuffer - Raw file bytes
 * @param {string} mimeType   - 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
 * @returns {Promise<{parsed: object, rawText: string}>}
 */
export async function parseReceiptDeepseek(fileBuffer, mimeType) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set — check your .env file');

  const base64 = fileBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: 'Parse this receipt.' },
          ],
        },
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

  // Strip markdown code fences if present
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
