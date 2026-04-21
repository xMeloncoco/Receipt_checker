import { useState, useMemo, useCallback } from 'react';
import ReviewHeader from './ReviewHeader.jsx';
import ReviewLine from './ReviewLine.jsx';
import ReviewTotals from './ReviewTotals.jsx';
import MatchSelector from './MatchSelector.jsx';
import ZoomableImage from './ZoomableImage.jsx';
import Spinner from '../ui/Spinner.jsx';
import { saveReceipt, checkItemsPerStore } from '../../lib/api.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildInitialFormData(parsed) {
  return {
    store_name: parsed.store_name || '',
    receipt_id: parsed.receipt_id || '',
    purchase_date: parsed.date || '',
    purchase_time: parsed.time || '',
    total_with_discount: parsed.total_with_discount != null ? String(parsed.total_with_discount) : '',
    total_without_discount: parsed.total_without_discount != null ? String(parsed.total_without_discount) : '',
    lines: (parsed.lines || []).map((l) => ({
      receipt_line_id: l.receipt_line_id || '',
      name_on_receipt: l.name || '',
      brand: l.brand || '',
      amount: l.amount || '',
      quantity: l.quantity != null ? String(l.quantity) : '1',
      price_per_item: l.price_per_item != null ? String(l.price_per_item) : '',
      discount_per_item: l.discount_per_item != null ? String(l.discount_per_item) : '0',
      total_discount: l.total_discount != null ? String(l.total_discount) : '0',
      price_total: l.price_total != null ? String(l.price_total) : '',
      // Fields populated from items_per_store match
      item_id: null,
      item_name: '',
      items_per_store_match_id: null,
    })),
  };
}

function matchLinesToStore(lines, itemsPerStore) {
  return lines.map((line) => {
    const name = line.name_on_receipt?.trim();
    if (!name) return { status: 'new', candidates: [], match: null };

    const candidates = itemsPerStore.filter(
      (ips) => ips.name_on_receipt === name,
    );

    if (candidates.length === 0) {
      return { status: 'new', candidates: [], match: null };
    }
    if (candidates.length === 1) {
      const match = candidates[0];
      // Compare fields to determine if changed
      const priceChanged =
        line.price_per_item !== '' &&
        match.price != null &&
        Number(line.price_per_item) !== Number(match.price);
      const brandChanged =
        line.brand !== '' &&
        match.brand != null &&
        line.brand !== match.brand;
      const amountChanged =
        line.amount !== '' &&
        match.amount != null &&
        line.amount !== match.amount;

      const hasChanges = priceChanged || brandChanged || amountChanged;

      return {
        status: hasChanges ? 'changed' : 'matched',
        candidates,
        match,
        changedFields: {
          price_per_item: priceChanged ? String(match.price) : null,
          brand: brandChanged ? match.brand : null,
          amount: amountChanged ? match.amount : null,
        },
      };
    }
    // Multiple matches
    return { status: 'multiple', candidates, match: null };
  });
}

function applyMatchToLine(line, match) {
  return {
    ...line,
    item_id: match.item_id || match.items?.id || null,
    item_name: match.items?.name || '',
    brand: line.brand || match.brand || '',
    amount: line.amount || match.amount || '',
    items_per_store_match_id: match.id,
  };
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ReceiptReview({
  parsedData,
  rawText,
  file,
  store,
  itemsPerStore: initialItemsPerStore,
  onReset,
  onSaved,
  continueLabel = 'Upload Another Receipt',
}) {
  const [formData, setFormData] = useState(() => buildInitialFormData(parsedData));
  const [editedFields, setEditedFields] = useState({});
  const [itemsPerStore, setItemsPerStore] = useState(initialItemsPerStore || []);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [matchSelectorIndex, setMatchSelectorIndex] = useState(null);

  // ── Compute match results ──────────────────────────────────────────────
  const matchResults = useMemo(
    () => matchLinesToStore(formData.lines, itemsPerStore),
    [formData.lines, itemsPerStore],
  );

  // Apply auto-matches on initial load (single matches fill in item/brand/amount)
  useState(() => {
    const newLines = formData.lines.map((line, i) => {
      const info = matchResults[i];
      if (info && info.status !== 'new' && info.match) {
        return applyMatchToLine(line, info.match);
      }
      return line;
    });
    if (newLines.some((l, i) => l !== formData.lines[i])) {
      setFormData((prev) => ({ ...prev, lines: newLines }));
    }
  });

  const hasEdits = Object.keys(editedFields).length > 0;

  // ── Preview URL ────────────────────────────────────────────────────────
  const previewUrl = useMemo(() => {
    if (!file) return null;
    if (file.type?.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  }, [file]);

  // ── Field change handlers ──────────────────────────────────────────────

  const handleHeaderFieldChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setEditedFields((prev) => ({ ...prev, [`header.${field}`]: true }));
  }, []);

  const handleLineFieldChange = useCallback((lineIndex, field, value) => {
    setFormData((prev) => {
      const newLines = [...prev.lines];
      newLines[lineIndex] = { ...newLines[lineIndex], [field]: value };
      return { ...prev, lines: newLines };
    });
    setEditedFields((prev) => ({ ...prev, [`line.${lineIndex}.${field}`]: true }));
  }, []);

  // ── Field status computation ───────────────────────────────────────────

  const getHeaderFieldStatus = useCallback(
    (field) => {
      if (editedFields[`header.${field}`]) return 'red';
      return 'standard';
    },
    [editedFields],
  );

  const getHeaderOriginalValue = useCallback(() => null, []);

  const getLineFieldStatus = useCallback(
    (lineIndex, field) => {
      if (editedFields[`line.${lineIndex}.${field}`]) return 'red';

      const info = matchResults[lineIndex];
      if (!info) return 'standard';

      if (info.status === 'new') return 'green';
      if (info.status === 'multiple') return 'standard';

      // matched or changed
      if (info.status === 'changed' && info.changedFields[field]) {
        return 'blue';
      }
      return 'standard';
    },
    [editedFields, matchResults],
  );

  const getLineOriginalValue = useCallback(
    (lineIndex, field) => {
      const info = matchResults[lineIndex];
      if (!info || info.status !== 'changed') return null;
      return info.changedFields[field] || null;
    },
    [matchResults],
  );

  // ── Match selector ────────────────────────────────────────────────────

  const handleMatchSelect = useCallback(
    (match) => {
      if (matchSelectorIndex == null) return;
      setFormData((prev) => {
        const newLines = [...prev.lines];
        newLines[matchSelectorIndex] = applyMatchToLine(
          newLines[matchSelectorIndex],
          match,
        );
        return { ...prev, lines: newLines };
      });
      setMatchSelectorIndex(null);
    },
    [matchSelectorIndex],
  );

  const handleAddNewFromSelector = useCallback(() => {
    if (matchSelectorIndex == null) return;
    // Mark as new — clear any match
    setFormData((prev) => {
      const newLines = [...prev.lines];
      newLines[matchSelectorIndex] = {
        ...newLines[matchSelectorIndex],
        items_per_store_match_id: null,
        item_id: null,
        item_name: '',
      };
      return { ...prev, lines: newLines };
    });
    setMatchSelectorIndex(null);
  }, [matchSelectorIndex]);

  // ── Check with database ───────────────────────────────────────────────

  const handleCheckDatabase = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const result = await checkItemsPerStore(formData.store_name);
      setItemsPerStore(result.itemsPerStore || []);
      // Clear edited fields so colors recompute against fresh DB data
      setEditedFields({});
      // Re-apply matches
      const newMatchResults = matchLinesToStore(formData.lines, result.itemsPerStore || []);
      const newLines = formData.lines.map((line, i) => {
        const info = newMatchResults[i];
        if (info && info.status !== 'new' && info.status !== 'multiple' && info.match) {
          return applyMatchToLine(line, info.match);
        }
        return { ...line, items_per_store_match_id: null, item_id: null, item_name: line.item_name };
      });
      setFormData((prev) => ({ ...prev, lines: newLines }));
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }, [formData.store_name, formData.lines]);

  // ── Send to database ──────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        store_name: formData.store_name,
        receipt_id: formData.receipt_id || null,
        purchase_date: formData.purchase_date,
        purchase_time: formData.purchase_time || null,
        total_with_discount: Number(formData.total_with_discount),
        total_without_discount: formData.total_without_discount ? Number(formData.total_without_discount) : null,
        raw_ai_output: rawText || null,
        lines: formData.lines.map((l) => ({
          receipt_line_id: l.receipt_line_id || null,
          name_on_receipt: l.name_on_receipt,
          brand: l.brand || null,
          amount: l.amount || null,
          quantity: Number(l.quantity) || 1,
          price_per_item: l.price_per_item !== '' ? Number(l.price_per_item) : null,
          discount_per_item: Number(l.discount_per_item) || 0,
          total_discount: Number(l.total_discount) || 0,
          price_total: l.price_total !== '' ? Number(l.price_total) : null,
          item_id: l.item_id || null,
          item_name: l.item_name || null,
          items_per_store_match_id: l.items_per_store_match_id || null,
        })),
      };

      await saveReceipt(payload, file);
      setSaveSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [formData, rawText, file]);

  // ── Success screen ────────────────────────────────────────────────────

  if (saveSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="bg-green-50 border border-green-300 rounded-xl px-8 py-6 max-w-md text-center">
          <div className="text-4xl mb-3">&#10003;</div>
          <h2 className="text-lg font-bold text-green-800 mb-2">
            Receipt Saved Successfully
          </h2>
          <p className="text-green-700 text-sm">
            All data has been saved to the database.
          </p>
        </div>
        <button
          onClick={onSaved || onReset}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          {continueLabel}
        </button>
      </div>
    );
  }

  // ── Main review layout ────────────────────────────────────────────────

  return (
    <div className="flex gap-6 items-start">
      {/* Left: Receipt image */}
      <div className="w-2/5 sticky top-4 shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {previewUrl ? (
            <ZoomableImage src={previewUrl} alt="Receipt" />
          ) : file?.type === 'application/pdf' ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="text-5xl mb-2">&#128196;</div>
              <p className="text-sm">PDF receipt</p>
              <p className="text-xs">{file.name}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <p className="text-sm">No preview available</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Editable receipt form */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <ReviewHeader
          formData={formData}
          onFieldChange={handleHeaderFieldChange}
          getFieldStatus={getHeaderFieldStatus}
          getOriginalValue={getHeaderOriginalValue}
        />

        {/* Color legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-green-400 bg-green-50"></span>
            New item
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-blue-400 bg-blue-50"></span>
            Changed from DB
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border-2 border-red-400 bg-red-50"></span>
            Edited by you
          </span>
        </div>

        {/* Receipt lines */}
        <div>
          {formData.lines.map((line, i) => (
            <ReviewLine
              key={i}
              index={i}
              line={line}
              onFieldChange={handleLineFieldChange}
              getFieldStatus={getLineFieldStatus}
              getOriginalValue={getLineOriginalValue}
              matchInfo={matchResults[i]}
              onOpenMatchSelector={setMatchSelectorIndex}
            />
          ))}
          {formData.lines.length === 0 && (
            <p className="py-8 text-center text-gray-400 text-sm">
              No line items parsed.
            </p>
          )}
        </div>

        <ReviewTotals
          formData={formData}
          onFieldChange={handleHeaderFieldChange}
          getFieldStatus={getHeaderFieldStatus}
          getOriginalValue={getHeaderOriginalValue}
        />

        {/* Error message */}
        {error && (
          <p className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded px-4 py-2">
            {error}
          </p>
        )}

        {/* Action button */}
        <div className="mt-6">
          {hasEdits ? (
            <button
              onClick={handleCheckDatabase}
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg
                bg-amber-500 text-white font-semibold text-sm
                hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {checking ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Checking...
                </>
              ) : (
                'Check with Database'
              )}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg
                bg-green-600 text-white font-semibold text-sm
                hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Saving...
                </>
              ) : (
                'Send to Database'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Match selector modal */}
      {matchSelectorIndex != null && matchResults[matchSelectorIndex]?.candidates && (
        <MatchSelector
          candidates={matchResults[matchSelectorIndex].candidates}
          onSelect={handleMatchSelect}
          onAddNew={handleAddNewFromSelector}
          onClose={() => setMatchSelectorIndex(null)}
        />
      )}
    </div>
  );
}
