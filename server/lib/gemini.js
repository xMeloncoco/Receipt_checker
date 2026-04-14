import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_INSTRUCTION = `You are a receipt parser. Analyze the receipt and return ONLY a JSON object with no other text, markdown, or explanation.

The JSON must follow this exact schema:
{
  "store_name": string,
  "receipt_id": string or null,
  "date": "YYYY-MM-DD",
  "time": "HH:MM or null",
  "total_with_discount": number,
  "total_without_discount": number or null,
  "lines": [
    {
      "receipt_line_id": string or null,
      "name": string,
      "brand": string or null,
      "amount": string or null,
      "quantity": number,
      "price_per_item": number,
      "discount_per_item": number,
      "total_discount": number,
      "price_total": number
    }
  ]
}

Rules:
- Keep "name" exactly as printed on the receipt — do not normalize or translate
- "receipt_id" is the receipt number / transaction number printed on the receipt (null if not visible)
- "receipt_line_id" is the line number or sequence number printed next to each item (null if not visible)
- "brand" is the brand name if visible on the line (e.g. "AH Huismerk", "Coca-Cola") — null if not shown
- "amount" is the weight, volume, or count if visible (e.g. "500g", "1.5L", "3 stuks") — null if not shown
- "price_per_item" is the unit price before any discount
- "discount_per_item" is the discount amount per single item (0 if no discount)
- "total_discount" is the total discount for the line (quantity * discount_per_item, or as printed) — 0 if none
- "price_total" is the final line total after discount
- If a line is a discount applied to a previous product, include it with a negative price_per_item and price_total
- "total_with_discount" is the amount actually paid (bottom-line total)
- "total_without_discount" is the subtotal before discounts (null if not printed on the receipt)
- Return null for time if not present on the receipt
- All monetary values must be numbers, not strings
- quantity defaults to 1 if not explicitly shown
- discount_per_item and total_discount default to 0
- Do not include subtotal, tax, or payment method lines in "lines" — only product lines and discounts`;

/**
 * Parse a receipt image or PDF using Gemini's vision.
 *
 * @param {Buffer} fileBuffer - Raw file bytes
 * @param {string} mimeType   - 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
 * @returns {Promise<{parsed: object, rawText: string}>}
 */
export { SYSTEM_INSTRUCTION };

export async function parseReceipt(fileBuffer, mimeType, modelName = 'gemini-2.5-flash', apiVersion = 'v1beta') {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set — check your .env file');

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel(
    { model: modelName, systemInstruction: SYSTEM_INSTRUCTION },
    { apiVersion },
  );

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
    const error = new Error('Model returned non-JSON output');
    error.rawText = rawText;
    throw error;
  }

  return { parsed, rawText };
}
