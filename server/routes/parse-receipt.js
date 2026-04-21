import { Router } from 'express';
import multer from 'multer';
import { parseReceipts } from '../lib/gemini.js';
import { parseReceiptsDeepseek } from '../lib/deepseek.js';
import supabase from '../lib/supabase-admin.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Upload JPEG, PNG, WebP, or PDF.'));
    }
  },
});

// Known models — type selects the provider. For Gemini, v1beta expects
// `systemInstruction` (camelCase) while v1 expects `system_instruction`
// (snake_case); `vision: false` strips image content before sending.
const MODEL_CONFIG = {
  'gemini-2.5-flash':              { type: 'gemini',   apiVersion: 'v1beta', vision: true },
  'gemini-2.5-flash-lite':         { type: 'gemini',   apiVersion: 'v1beta', vision: true },
  'gemini-3-flash-preview':        { type: 'gemini',   apiVersion: 'v1',     vision: true,  systemField: 'system_instruction' },
  'gemini-3.1-flash-lite-preview': { type: 'gemini',   apiVersion: 'v1',     vision: true,  systemField: 'system_instruction' },
  deepseek:                        { type: 'deepseek', model: 'deepseek-vl2', vision: true },
};

// ─── POST /api/parse-receipt?model=<name> ────────────────────────────────────
// Accepts N files in a single multipart request (field name "receipt"), sends
// them all to the chosen model in one call, and returns an array of parse
// results. Read-only DB lookups (duplicate + items_per_store) happen per
// returned receipt, cross-store for duplicate detection.
router.post('/parse-receipt', upload.array('receipt'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  const modelName = req.query.model || 'gemini-2.5-flash';
  const config = MODEL_CONFIG[modelName];

  if (!config) {
    return res.status(400).json({ error: `Unknown model: ${modelName}` });
  }

  const files = req.files.map((f) => ({ buffer: f.buffer, mimeType: f.mimetype }));

  // ── 1. Call the requested model once with all files ─────────────────────
  let parsedArray, rawText;
  try {
    if (config.type === 'gemini') {
      ({ parsed: parsedArray, rawText } = await parseReceipts(files, modelName, config));
    } else {
      ({ parsed: parsedArray, rawText } = await parseReceiptsDeepseek(files, config));
    }

    if (parsedArray.length !== files.length) {
      return res.status(422).json({
        error: `Model returned ${parsedArray.length} receipts for ${files.length} images.`,
        errorType: 'model_error',
        rawText,
      });
    }

    for (const parsed of parsedArray) {
      const { store_name, date, total_with_discount, lines } = parsed;
      if (!store_name || !date || total_with_discount == null || !Array.isArray(lines)) {
        return res.status(422).json({
          error: 'Model returned incomplete data for at least one receipt.',
          errorType: 'model_error',
          rawText,
        });
      }
    }
  } catch (err) {
    console.error(`model error (${modelName}):`, err);
    return res.status(502).json({
      error: err.message || 'Model request failed',
      errorType: 'model_error',
      rawText: err.rawText,
    });
  }

  // ── 2. For each parsed receipt, run read-only DB lookups ────────────────
  try {
    const results = [];

    for (const parsed of parsedArray) {
      const { store_name, date, time, total_with_discount } = parsed;

      // Store lookup (read-only)
      const { data: existingStores, error: storeSelectErr } = await supabase
        .from('stores')
        .select('*')
        .ilike('name', store_name.trim())
        .limit(1);
      if (storeSelectErr) throw storeSelectErr;
      const store = existingStores.length > 0 ? existingStores[0] : null;

      // Cross-store duplicate check on (date, time, total_with_discount) — so
      // renaming the store between uploads doesn't sneak a duplicate through.
      const purchaseTime = time || null;
      let dupQuery = supabase
        .from('receipts')
        .select('id, store_id, stores(name)')
        .eq('purchase_date', date)
        .eq('total_with_discount', total_with_discount);

      if (purchaseTime) dupQuery = dupQuery.eq('purchase_time', purchaseTime);
      else dupQuery = dupQuery.is('purchase_time', null);

      const { data: dupRows, error: dupErr } = await dupQuery.limit(1);
      if (dupErr) throw dupErr;

      let isDuplicate = false;
      let duplicateReceiptId = null;
      let duplicateStoreName = null;
      if (dupRows.length > 0) {
        isDuplicate = true;
        duplicateReceiptId = dupRows[0].id;
        duplicateStoreName = dupRows[0].stores?.name || null;
      }

      // items_per_store for this receipt's store (if any)
      let itemsPerStore = [];
      if (store) {
        const { data: ipsRows, error: ipsErr } = await supabase
          .from('items_per_store')
          .select('*, items(id, name, type, subtype)')
          .eq('store_id', store.id);
        if (ipsErr) throw ipsErr;
        itemsPerStore = ipsRows || [];
      }

      results.push({
        parsed,
        store,
        isDuplicate,
        duplicateReceiptId,
        duplicateStoreName,
        itemsPerStore,
      });
    }

    return res.json({ results, rawText });
  } catch (err) {
    console.error(`app error after model ${modelName} succeeded:`, err);
    return res.status(500).json({
      error: err.message || 'Internal server error',
      errorType: 'app_error',
    });
  }
});

export default router;
