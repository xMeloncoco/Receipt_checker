import { SYSTEM_INSTRUCTION, parseArrayOutput } from './gemini.js';

/**
 * Parse one or more receipt images via DeepSeek's OpenAI-compatible API.
 * `files` is an array of { buffer, mimeType }.
 */
export async function parseReceiptsDeepseek(files, config = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set — check your .env file');

  const vision = config.vision ?? true;
  const model = config.model ?? 'deepseek-vl2';

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

  return parseArrayOutput(rawText);
}
