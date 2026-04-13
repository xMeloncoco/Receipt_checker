import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_INSTRUCTION = `You are a receipt parser. Analyze the receipt and return ONLY a JSON object with no other text, markdown, or explanation.

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
 * Parse a receipt image or PDF using Gemini's vision.
 *
 * @param {Buffer} fileBuffer - Raw file bytes
 * @param {string} mimeType   - 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
 * @returns {Promise<{parsed: object, rawText: string}>}
 */
export async function parseReceipt(fileBuffer, mimeType) {
  // Lazy init — keeps the server alive even if GEMINI_API_KEY isn't set yet
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set — check your .env file');

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const base64 = fileBuffer.toString('base64');

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64,
        mimeType,
      },
    },
    'Parse this receipt.',
  ]);

  const rawText = result.response.text().trim();

  // Strip markdown code fences if Gemini wrapped the JSON
  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    const error = new Error('Gemini returned non-JSON output');
    error.rawText = rawText;
    throw error;
  }

  return { parsed, rawText };
}
