import { Router } from 'express';
import multer from 'multer';
import supabase from '../lib/supabase-admin.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type.'));
    }
  },
});

// ─── POST /api/save-receipt ──────────────────────────────────────────────────
// Saves the reviewed receipt data to the database.
// Accepts multipart form: receipt image file + JSON "data" field.
router.post('/save-receipt', upload.single('receipt'), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    const {
      store_name,
      receipt_id,
      purchase_date,
      purchase_time,
      total_with_discount,
      total_without_discount,
      raw_ai_output,
      lines,
    } = data;

    if (!store_name || !purchase_date || total_with_discount == null || !Array.isArray(lines)) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // ── 1. Upsert store ─────────────────────────────────────────────────
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
        .insert({ name: store_name.trim() })
        .select()
        .single();
      if (storeInsertErr) throw storeInsertErr;
      store = newStore;
    }

    // ── 2. Upload image to Supabase Storage ─────────────────────────────
    let imageUrl = null;

    if (req.file) {
      const ext =
        req.file.mimetype === 'application/pdf' ? 'pdf'
        : req.file.mimetype === 'image/png' ? 'png'
        : req.file.mimetype === 'image/webp' ? 'webp'
        : 'jpg';
      const storagePath = `${store.id}/${purchase_date}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (!uploadErr) {
        imageUrl = storagePath;
      }
    }

    // ── 3. Insert receipt ───────────────────────────────────────────────
    // user_id is NOT NULL in the schema; auth.uid() doesn't work with service role.
    // Use a placeholder until real auth is implemented.
    const PLACEHOLDER_USER_ID = '00000000-0000-0000-0000-000000000000';

    const { data: receipt, error: receiptErr } = await supabase
      .from('receipts')
      .insert({
        receipt_id: receipt_id || null,
        store_id: store.id,
        user_id: PLACEHOLDER_USER_ID,
        purchase_date,
        purchase_time: purchase_time || null,
        total_with_discount,
        total_without_discount: total_without_discount ?? null,
        image_url: imageUrl,
        raw_ai_output: raw_ai_output || null,
      })
      .select()
      .single();

    if (receiptErr) throw receiptErr;

    // ── 4. Insert receipt lines + upsert items_per_store ────────────────
    const savedLines = [];

    for (const line of lines) {
      const nameOnReceipt = line.name_on_receipt?.trim();
      if (!nameOnReceipt) continue;

      // Insert receipt_line
      const { data: receiptLine, error: lineErr } = await supabase
        .from('receipt_lines')
        .insert({
          receipt_id: receipt.id,
          receipt_line_id: line.receipt_line_id || null,
          item_id: line.item_id || null,
          name_on_receipt: nameOnReceipt,
          brand: line.brand || null,
          amount: line.amount || null,
          quantity: line.quantity ?? 1,
          price_per_item: line.price_per_item ?? null,
          discount_per_item: line.discount_per_item ?? 0,
          total_discount: line.total_discount ?? 0,
          price_total: line.price_total ?? null,
        })
        .select()
        .single();

      if (lineErr) throw lineErr;

      // Upsert items_per_store
      // Skip discount lines (negative price)
      if (line.price_per_item != null && line.price_per_item >= 0) {
        if (line.items_per_store_match_id) {
          // Update existing items_per_store row
          const { error: updateErr } = await supabase
            .from('items_per_store')
            .update({
              price: line.price_per_item,
              brand: line.brand || null,
              amount: line.amount || null,
              item_id: line.item_id || null,
              latest_update_date: purchase_date,
              latest_update_receipt_line_id: receiptLine.id,
            })
            .eq('id', line.items_per_store_match_id);

          if (updateErr) throw updateErr;
        } else {
          // Insert new items_per_store row
          const { error: insertErr } = await supabase
            .from('items_per_store')
            .insert({
              store_id: store.id,
              item_id: line.item_id || null,
              name_on_receipt: nameOnReceipt,
              brand: line.brand || null,
              amount: line.amount || null,
              price: line.price_per_item,
              latest_update_date: purchase_date,
              latest_update_receipt_line_id: receiptLine.id,
            });

          // Ignore unique constraint violations (another receipt line may have already inserted)
          if (insertErr && insertErr.code !== '23505') throw insertErr;
        }
      }

      savedLines.push(receiptLine);
    }

    return res.json({
      success: true,
      receipt,
      store,
      lines: savedLines,
    });
  } catch (err) {
    console.error('save-receipt error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error',
    });
  }
});

// ─── POST /api/check-items-per-store ─────────────────────────────────────────
// Re-fetches items_per_store for a store (used after edits / "Check with database").
router.post('/check-items-per-store', async (req, res) => {
  try {
    const { store_name } = req.body;
    if (!store_name) {
      return res.status(400).json({ error: 'store_name is required.' });
    }

    const { data: stores, error: storeErr } = await supabase
      .from('stores')
      .select('*')
      .ilike('name', store_name.trim())
      .limit(1);

    if (storeErr) throw storeErr;

    if (stores.length === 0) {
      return res.json({ store: null, itemsPerStore: [] });
    }

    const store = stores[0];

    const { data: ipsRows, error: ipsErr } = await supabase
      .from('items_per_store')
      .select('*, items(id, name, type, subtype)')
      .eq('store_id', store.id);

    if (ipsErr) throw ipsErr;

    return res.json({ store, itemsPerStore: ipsRows || [] });
  } catch (err) {
    console.error('check-items-per-store error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
