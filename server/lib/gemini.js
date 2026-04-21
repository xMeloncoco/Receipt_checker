const SYSTEM_INSTRUCTION = `You are a receipt parser. You will be shown one or more receipt images. Return ONLY a JSON array with no other text, markdown, or explanation.

Each element of the array is one receipt and must follow this exact schema:
{
  "store_name": string,
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
- Always return a JSON array, even when only one receipt image is provided (e.g. [{...}]).
- Return exactly one element per image, in the same order the images were provided.
- Keep "name" exactly as printed on the receipt — do not normalize or translate
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
- Do not include subtotal, tax, or payment method lines in "lines" — only product lines and discounts
- Do NOT include any receipt number / transaction number — that field is ignored downstream.`;

export { SYSTEM_INSTRUCTION };

/**
 * Parse one or more receipt images/PDFs via Gemini's generateContent REST API.
 * `files` is an array of { buffer, mimeType }. The model is told to return a
 * JSON array with one entry per image (see SYSTEM_INSTRUCTION).
 */
export async function parseReceipts(files, modelName, config = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set — check your .env file');

  const apiVersion = config.apiVersion ?? 'v1beta';
  const systemField = config.systemField ?? 'systemInstruction';
  const vision = config.vision ?? true;

  const parts = [];
  if (vision) {
    for (const f of files) {
      parts.push({
        inlineData: {
          data: f.buffer.toString('base64'),
          mimeType: f.mimeType,
        },
      });
    }
  }
  parts.push({
    text:
      files.length === 1
        ? 'Parse this receipt. Return a JSON array with one element.'
        : `Parse these ${files.length} receipts. Return a JSON array with ${files.length} elements, one per image in the same order.`,
  });

  const body = {
    [systemField]: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts }],
  };

  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${key}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();

  if (!rawText) throw new Error('Gemini returned empty response');

  return parseArrayOutput(rawText);
}

// ── Shared output parser ─────────────────────────────────────────────────────
export function parseArrayOutput(rawText) {
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

  // Accept a single object as a convenience; wrap it.
  if (!Array.isArray(parsed)) {
    if (parsed && typeof parsed === 'object') parsed = [parsed];
    else {
      const error = new Error('Model returned a non-array, non-object response');
      error.rawText = rawText;
      throw error;
    }
  }

  return { parsed, rawText };
}
