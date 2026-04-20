import { Router } from 'express';
import multer from 'multer';
import { parseReceipt } from '../lib/gemini.js';
import { parseReceiptDeepseek } from '../lib/deepseek.js';
import supabase from '../lib/supabase-admin.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
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
// Parse-only: calls AI, checks for duplicates, looks up items_per_store.
// Does NOT write anything to the database.
router.post('/parse-receipt', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const modelName = req.query.model || 'gemini-2.5-flash';
  const config = MODEL_CONFIG[modelName];

  if (!config) {
    return res.status(400).json({ error: `Unknown model: ${modelName}` });
  }

  // ── 1. Call the requested model ─────────────────────────────────────────
  let parsed, rawText;

  try {
    if (config.type === 'gemini') {
      ({ parsed, rawText } = await parseReceipt(req.file.buffer, req.file.mimetype, modelName, config));
    } else {
      ({ parsed, rawText } = await parseReceiptDeepseek(req.file.buffer, req.file.mimetype, config));
    }

    const { store_name, date, total_with_discount, lines } = parsed;

    if (!store_name || !date || total_with_discount == null || !Array.isArray(lines)) {
      return res.status(422).json({
        error: 'Model returned incomplete data.',
        errorType: 'model_error',
        rawText,
      });
    }
  } catch (err) {
    // Model / API error — the frontend should try the next model.
    console.error(`model error (${modelName}):`, err);
    return res.status(502).json({
      error: err.message || 'Model request failed',
      errorType: 'model_error',
    });
  }

  // ── 2. Model succeeded — now do read-only DB lookups ────────────────────
  try {
    const { store_name, date, time, total_with_discount } = parsed;

    // ── Look up store (read-only) ────────────────────────────────────────
    const { data: existingStores, error: storeSelectErr } = await supabase
      .from('stores')
      .select('*')
      .ilike('name', store_name.trim())
      .limit(1);

    if (storeSelectErr) throw storeSelectErr;

    const store = existingStores.length > 0 ? existingStores[0] : null;

    // ── Duplicate receipt check ──────────────────────────────────────────
    let isDuplicate = false;
    let duplicateReceiptId = null;

    if (store) {
      const purchaseTime = time || null;

      let query = supabase
        .from('receipts')
        .select('id')
        .eq('store_id', store.id)
        .eq('purchase_date', date)
        .eq('total_with_discount', total_with_discount);

      if (purchaseTime) {
        query = query.eq('purchase_time', purchaseTime);
      } else {
        query = query.is('purchase_time', null);
      }

      const { data: dupCheck, error: dupErr } = await query.limit(1);
      if (dupErr) throw dupErr;

      if (dupCheck.length > 0) {
        isDuplicate = true;
        duplicateReceiptId = dupCheck[0].id;
      }
    }

    // ── Fetch items_per_store for this store ─────────────────────────────
    let itemsPerStore = [];

    if (store) {
      const { data: ipsRows, error: ipsErr } = await supabase
        .from('items_per_store')
        .select('*, items(id, name, type, subtype)')
        .eq('store_id', store.id);

      if (ipsErr) throw ipsErr;
      itemsPerStore = ipsRows || [];
    }

    // ── Return parse result + DB context (no writes) ─────────────────────
    return res.json({
      parsed,
      rawText,
      store,
      isDuplicate,
      duplicateReceiptId,
      itemsPerStore,
    });
  } catch (err) {
    console.error(`app error after model ${modelName} succeeded:`, err);
    return res.status(500).json({
      error: err.message || 'Internal server error',
      errorType: 'app_error',
    });
  }
});

export default router;
