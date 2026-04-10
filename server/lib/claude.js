import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a receipt parser. Analyze the receipt and return ONLY a JSON object with no other text, markdown, or explanation.

The JSON must follow this exact schema:
{
  "store_name": string,
  "date": "YYYY-MM-DD",
  "time": "HH:MM or null",
  "total": number,
  "lines": [
    {
      "name": string,
      "quantity": number,
      "unit_price": number,
      "line_total": number,
      "discount_label": string or null
    }
  ]
}

Rules:
- Keep "name" exactly as printed on the receipt — do not normalize or translate
- If a line is a discount, include it with a negative unit_price and populate discount_label (e.g. "Bonus", "Korting")
- Return null for time if not present on the receipt
- All monetary values must be numbers, not strings
- quantity defaults to 1 if not explicitly shown
- Do not include subtotal, tax, or payment method lines in "lines" — only product lines and discounts`;

/**
 * Parse a receipt image or PDF using Claude's vision.
 *
 * @param {Buffer} fileBuffer - Raw file bytes
 * @param {string} mimeType   - 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
 * @returns {Promise<{parsed: object, rawText: string}>}
 */
export async function parseReceipt(fileBuffer, mimeType) {
  const base64 = fileBuffer.toString('base64');

  let contentBlock;
  if (mimeType === 'application/pdf') {
    contentBlock = {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    };
  } else {
    contentBlock = {
      type: 'image',
      source: { type: 'base64', media_type: mimeType, data: base64 },
    };
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [contentBlock, { type: 'text', text: 'Parse this receipt.' }],
      },
    ],
  });

  const rawText = response.content[0].text.trim();

  // Strip markdown code fences if Claude wrapped the JSON
  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    const error = new Error('Claude returned non-JSON output');
    error.rawText = rawText;
    throw error;
  }

  return { parsed, rawText };
}
