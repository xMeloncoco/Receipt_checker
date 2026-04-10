import { Router } from 'express';
import multer from 'multer';
import { parseReceipt } from '../lib/claude.js';
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

// ─── POST /api/parse-receipt ─────────────────────────────────────────────────
router.post('/parse-receipt', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    // ── 1. Call Claude ─────────────────────────────────────────────────────
    const { parsed, rawText } = await parseReceipt(req.file.buffer, req.file.mimetype);

    const { store_name, date, time, total, lines } = parsed;

    if (!store_name || !date || total == null || !Array.isArray(lines)) {
      return res.status(422).json({
        error: 'Claude returned incomplete data.',
        rawText,
      });
    }

    // ── 2. Upsert store (case-insensitive match on name) ───────────────────
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

    // ── 3. Duplicate receipt check ─────────────────────────────────────────
    // Uses the dedup index logic: COALESCE(purchase_time, '00:00')
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
        purchaseTime ? dedupeTime : null
      )
      .limit(1);

    if (dupErr) throw dupErr;

    if (dupCheck.length > 0) {
      return res.json({
        is_duplicate: true,
        existing_receipt_id: dupCheck[0].id,
        store,
        parsed,
      });
    }

    // ── 4. Upload image to Supabase Storage ────────────────────────────────
    const ext = req.file.mimetype === 'application/pdf' ? 'pdf'
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

    // Storage upload failure is non-fatal — continue without image
    const imageUrl = uploadErr ? null : storagePath;

    // ── 5. Insert receipt ──────────────────────────────────────────────────
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

    // ── 6. Upsert store_items and build receipt_lines ──────────────────────
    const receiptLineInserts = [];

    for (const line of lines) {
      const nameOnReceipt = line.name?.trim();
      if (!nameOnReceipt) continue;

      // Try to insert the store_item; ignore conflict (same store + name)
      const { data: insertedItem, error: itemInsertErr } = await supabase
        .from('store_items')
        .insert({
          store_id: store.id,
          name_on_receipt: nameOnReceipt,
          price: line.unit_price,
          is_discount: (line.unit_price < 0),
          discount_label: line.discount_label || null,
        })
        .select()
        .single();

      let storeItem;
      let isNew = false;

      if (itemInsertErr) {
        if (itemInsertErr.code === '23505') {
          // Unique violation — item already exists, fetch it
          const { data: existing, error: fetchErr } = await supabase
            .from('store_items')
            .select('*')
            .eq('store_id', store.id)
            .eq('name_on_receipt', nameOnReceipt)
            .single();
          if (fetchErr) throw fetchErr;
          storeItem = existing;
          isNew = false;
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

    // ── 7. Insert receipt_lines ────────────────────────────────────────────
    const lineRows = receiptLineInserts.map(({ _store_item: _, ...row }) => row);

    const { data: insertedLines, error: linesErr } = await supabase
      .from('receipt_lines')
      .insert(lineRows)
      .select();

    if (linesErr) throw linesErr;

    // ── 8. Build response ──────────────────────────────────────────────────
    const enrichedLines = insertedLines.map((dbLine, i) => ({
      ...dbLine,
      store_item: receiptLineInserts[i]._store_item,
    }));

    return res.json({
      is_duplicate: false,
      receipt,
      store,
      lines: enrichedLines,
    });
  } catch (err) {
    console.error('parse-receipt error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error',
      rawText: err.rawText,
    });
  }
});

export default router;
