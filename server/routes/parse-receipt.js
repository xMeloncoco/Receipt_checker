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

// Ordered list of models to try. DeepSeek is the final fallback.
const MODELS = [
  { name: 'gemini-2.5-flash', type: 'gemini' },
  { name: 'gemini-2.5-flash-lite', type: 'gemini' },
  { name: 'gemini-3-flash', type: 'gemini' },
  { name: 'gemini-3.1-flash-lite', type: 'gemini' },
  { name: 'deepseek', type: 'deepseek' },
];

// ─── POST /api/parse-receipt ─────────────────────────────────────────────────
// Streams NDJSON events so the frontend can show real-time model attempt status.
// Event types: attempting | failed | success | result | error | all_failed
router.post('/parse-receipt', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  // ── Set up streaming NDJSON response ────────────────────────────────────
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering

  const send = (event) => {
    res.write(JSON.stringify(event) + '\n');
    // Flush for proxies that buffer (like the Vite dev proxy)
    if (typeof res.flush === 'function') res.flush();
  };

  // Track whether the client disconnected
  let aborted = false;
  req.on('close', () => { aborted = true; });

  // ── 1. Try each model in order ──────────────────────────────────────────
  let parsed, rawText;
  let successModel = null;
  const attempts = []; // { model, error } for the report

  for (const model of MODELS) {
    if (aborted) break;

    send({ type: 'attempting', model: model.name });

    try {
      if (model.type === 'gemini') {
        ({ parsed, rawText } = await parseReceipt(req.file.buffer, req.file.mimetype, model.name));
      } else {
        ({ parsed, rawText } = await parseReceiptDeepseek(req.file.buffer, req.file.mimetype));
      }

      // Basic validation before declaring success
      const { store_name, date, total, lines } = parsed;
      if (!store_name || !date || total == null || !Array.isArray(lines)) {
        throw new Error('Model returned incomplete data (missing store_name, date, total, or lines).');
      }

      send({ type: 'success', model: model.name });
      successModel = model.name;
      break;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      attempts.push({ model: model.name, error: errorMessage });
      send({ type: 'failed', model: model.name, error: errorMessage });
    }
  }

  // ── All models failed ───────────────────────────────────────────────────
  if (!successModel) {
    send({ type: 'all_failed', attempts });
    res.end();
    return;
  }

  // ── 2. Proceed with DB operations (same as before) ──────────────────────
  try {
    const { store_name, date, time, total, lines } = parsed;

    // ── Upsert store ──────────────────────────────────────────────────────
    const { data: existingStores, error: storeSelectErr } = await supabase
      .from('stores')
      .select('*')
      .ilike('name', store_name.trim())
      .limit(1);

    if (storeSelectErr) throw storeSelectErr;

    let store;
    if (existingStores.length > 0) {
      store = existingStores[0];
    } else {
      const { data: newStore, error: storeInsertErr } = await supabase
        .from('stores')
        .insert({ name: store_name.trim(), chain: store_name.trim() })
        .select()
        .single();
      if (storeInsertErr) throw storeInsertErr;
      store = newStore;
    }

    // ── Duplicate receipt check ───────────────────────────────────────────
    const purchaseTime = time || null;
    const dedupeTime = purchaseTime || '00:00';

    const { data: dupCheck, error: dupErr } = await supabase
      .from('receipts')
      .select('id')
      .eq('store_id', store.id)
      .eq('purchase_date', date)
      .eq('total_amount', total)
      .filter(
        'purchase_time',
        purchaseTime ? 'eq' : 'is',
        purchaseTime ? dedupeTime : null,
      )
      .limit(1);

    if (dupErr) throw dupErr;

    if (dupCheck.length > 0) {
      send({
        type: 'result',
        data: {
          is_duplicate: true,
          existing_receipt_id: dupCheck[0].id,
          store,
          parsed,
        },
      });
      res.end();
      return;
    }

    // ── Upload image to Supabase Storage ──────────────────────────────────
    const ext =
      req.file.mimetype === 'application/pdf' ? 'pdf'
      : req.file.mimetype === 'image/png' ? 'png'
      : req.file.mimetype === 'image/webp' ? 'webp'
      : 'jpg';
    const storagePath = `${store.id}/${date}_${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('receipts')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    const imageUrl = uploadErr ? null : storagePath;

    // ── Insert receipt ────────────────────────────────────────────────────
    const { data: receipt, error: receiptErr } = await supabase
      .from('receipts')
      .insert({
        store_id: store.id,
        purchase_date: date,
        purchase_time: purchaseTime,
        total_amount: total,
        image_url: imageUrl,
        raw_text: rawText,
      })
      .select()
      .single();

    if (receiptErr) throw receiptErr;

    // ── Upsert store_items and build receipt_lines ────────────────────────
    const receiptLineInserts = [];

    for (const line of lines) {
      const nameOnReceipt = line.name?.trim();
      if (!nameOnReceipt) continue;

      const { data: insertedItem, error: itemInsertErr } = await supabase
        .from('store_items')
        .insert({
          store_id: store.id,
          name_on_receipt: nameOnReceipt,
          price: line.unit_price,
          is_discount: line.unit_price < 0,
          discount_label: line.discount_label || null,
        })
        .select()
        .single();

      let storeItem;
      let isNew = false;

      if (itemInsertErr) {
        if (itemInsertErr.code === '23505') {
          const { data: existing, error: fetchErr } = await supabase
            .from('store_items')
            .select('*')
            .eq('store_id', store.id)
            .eq('name_on_receipt', nameOnReceipt)
            .single();
          if (fetchErr) throw fetchErr;
          storeItem = existing;
        } else {
          throw itemInsertErr;
        }
      } else {
        storeItem = insertedItem;
        isNew = true;
      }

      receiptLineInserts.push({
        receipt_id: receipt.id,
        store_item_id: storeItem.id,
        quantity: line.quantity ?? 1,
        unit_price: line.unit_price,
        line_total: line.line_total,
        is_new_store_item: isNew,
        _store_item: storeItem,
      });
    }

    // ── Insert receipt_lines ──────────────────────────────────────────────
    const lineRows = receiptLineInserts.map(({ _store_item: _, ...row }) => row);

    const { data: insertedLines, error: linesErr } = await supabase
      .from('receipt_lines')
      .insert(lineRows)
      .select();

    if (linesErr) throw linesErr;

    // ── Build & send final result ─────────────────────────────────────────
    const enrichedLines = insertedLines.map((dbLine, i) => ({
      ...dbLine,
      store_item: receiptLineInserts[i]._store_item,
    }));

    send({
      type: 'result',
      data: {
        is_duplicate: false,
        receipt,
        store,
        lines: enrichedLines,
      },
    });
  } catch (err) {
    console.error('parse-receipt error:', err);
    send({ type: 'error', error: err.message || 'Internal server error' });
  }

  res.end();
});

export default router;
