import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useReceipt } from '../hooks/useReceipt.js';
import supabase from '../lib/supabase.js';
import Spinner from '../components/ui/Spinner.jsx';

function useReceiptImageUrl(path) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let cancelled = false;
    (async () => {
      // Try a signed URL first (works on private buckets); fall back to public.
      const { data: signed } = await supabase.storage
        .from('receipts')
        .createSignedUrl(path, 3600);
      if (!cancelled && signed?.signedUrl) { setUrl(signed.signedUrl); return; }
      const { data: pub } = supabase.storage.from('receipts').getPublicUrl(path);
      if (!cancelled) setUrl(pub?.publicUrl || null);
    })();
    return () => { cancelled = true; };
  }, [path]);
  return url;
}

function NumberInput({ value, onChange, width = 'w-24' }) {
  return (
    <input
      type="number"
      step="0.01"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`border border-gray-300 rounded px-2 py-1 text-sm ${width} focus:outline-none focus:ring-2 focus:ring-indigo-300`}
    />
  );
}

function TextInput({ value, onChange, placeholder, width = 'w-40' }) {
  return (
    <input
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`border border-gray-300 rounded px-2 py-1 text-sm ${width} focus:outline-none focus:ring-2 focus:ring-indigo-300`}
    />
  );
}

function LineRow({ line, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(line);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setDraft(line); }, [line]);

  const set = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const patch = {
        name_on_receipt: draft.name_on_receipt,
        brand: draft.brand || null,
        amount: draft.amount || null,
        quantity: Number(draft.quantity) || 1,
        price_per_item: draft.price_per_item === '' ? null : Number(draft.price_per_item),
        discount_per_item: Number(draft.discount_per_item) || 0,
        total_discount: Number(draft.total_discount) || 0,
        price_total: draft.price_total === '' ? null : Number(draft.price_total),
      };
      await onSave(patch);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!confirm(`Delete line "${line.name_on_receipt}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <tr className="hover:bg-gray-50">
        <td className="px-3 py-2 text-gray-700">{line.name_on_receipt}</td>
        <td className="px-3 py-2 text-gray-700">{line.items?.name || '—'}</td>
        <td className="px-3 py-2 text-gray-700">{line.brand || '—'}</td>
        <td className="px-3 py-2 text-gray-700">{line.amount || '—'}</td>
        <td className="px-3 py-2 text-gray-700">{line.quantity}</td>
        <td className="px-3 py-2 text-gray-700">
          {line.price_per_item != null ? `€${Number(line.price_per_item).toFixed(2)}` : '—'}
        </td>
        <td className="px-3 py-2 text-gray-700">
          {line.total_discount != null ? `€${Number(line.total_discount).toFixed(2)}` : '—'}
        </td>
        <td className="px-3 py-2 text-gray-700">
          {line.price_total != null ? `€${Number(line.price_total).toFixed(2)}` : '—'}
        </td>
        <td className="px-3 py-2 text-right whitespace-nowrap">
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Edit
          </button>
          <button
            onClick={del}
            className="ml-2 text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-indigo-50/40">
      <td className="px-3 py-2">
        <TextInput value={draft.name_on_receipt} onChange={(v) => set('name_on_receipt', v)} width="w-44" />
      </td>
      <td className="px-3 py-2 text-gray-400 text-xs">{line.items?.name || '—'}</td>
      <td className="px-3 py-2">
        <TextInput value={draft.brand} onChange={(v) => set('brand', v)} width="w-28" />
      </td>
      <td className="px-3 py-2">
        <TextInput value={draft.amount} onChange={(v) => set('amount', v)} width="w-20" />
      </td>
      <td className="px-3 py-2">
        <NumberInput value={draft.quantity} onChange={(v) => set('quantity', v)} width="w-16" />
      </td>
      <td className="px-3 py-2">
        <NumberInput value={draft.price_per_item} onChange={(v) => set('price_per_item', v)} width="w-20" />
      </td>
      <td className="px-3 py-2">
        <NumberInput value={draft.total_discount} onChange={(v) => set('total_discount', v)} width="w-20" />
      </td>
      <td className="px-3 py-2">
        <NumberInput value={draft.price_total} onChange={(v) => set('price_total', v)} width="w-20" />
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        <button
          onClick={save}
          disabled={busy}
          className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={() => { setEditing(false); setDraft(line); setError(null); }}
          disabled={busy}
          className="ml-2 text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </td>
    </tr>
  );
}

export default function ReceiptDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    receipt,
    lines,
    loading,
    error,
    updateReceipt,
    deleteReceipt,
    updateLine,
    deleteLine,
  } = useReceipt(id);

  const [headerDraft, setHeaderDraft] = useState(null);
  const [headerBusy, setHeaderBusy] = useState(false);
  const [headerError, setHeaderError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const imageUrl = useReceiptImageUrl(receipt?.image_url);

  const headerEditing = headerDraft !== null;

  if (loading) {
    return (
      <div className="flex justify-center py-16"><Spinner /></div>
    );
  }

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!receipt) {
    return (
      <div className="space-y-4">
        <p className="text-gray-600">Receipt not found.</p>
        <Link to="/history" className="text-indigo-600 hover:underline text-sm">
          &larr; Back to history
        </Link>
      </div>
    );
  }

  const startHeaderEdit = () => {
    setHeaderDraft({
      receipt_id: receipt.receipt_id || '',
      purchase_date: receipt.purchase_date || '',
      purchase_time: receipt.purchase_time || '',
      total_with_discount: receipt.total_with_discount ?? '',
      total_without_discount: receipt.total_without_discount ?? '',
    });
    setHeaderError(null);
  };

  const saveHeader = async () => {
    setHeaderBusy(true);
    setHeaderError(null);
    try {
      await updateReceipt({
        receipt_id: headerDraft.receipt_id || null,
        purchase_date: headerDraft.purchase_date,
        purchase_time: headerDraft.purchase_time || null,
        total_with_discount: Number(headerDraft.total_with_discount),
        total_without_discount:
          headerDraft.total_without_discount === ''
            ? null
            : Number(headerDraft.total_without_discount),
      });
      setHeaderDraft(null);
    } catch (err) {
      setHeaderError(err.message);
    } finally {
      setHeaderBusy(false);
    }
  };

  const removeReceipt = async () => {
    if (!confirm('Delete this receipt and all its lines?')) return;
    setDeleting(true);
    try {
      await deleteReceipt();
      navigate('/history');
    } catch (err) {
      alert(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/history" className="text-indigo-600 hover:underline text-sm">
            &larr; Back to history
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Receipt Details</h1>
        </div>
        <button
          onClick={removeReceipt}
          disabled={deleting}
          className="px-3 py-1.5 rounded border border-red-300 text-red-700 text-sm hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete receipt'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-start">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt="Receipt" className="w-full object-contain max-h-[70vh]" />
          ) : (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              No image available
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Header</h2>
              {headerEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={saveHeader}
                    disabled={headerBusy}
                    className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setHeaderDraft(null); setHeaderError(null); }}
                    disabled={headerBusy}
                    className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={startHeaderEdit}
                  className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Edit
                </button>
              )}
            </div>

            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Store</dt>
              <dd className="text-gray-800">{receipt.stores?.name || '—'}</dd>

              <dt className="text-gray-500">Receipt #</dt>
              <dd>
                {headerEditing ? (
                  <TextInput
                    value={headerDraft.receipt_id}
                    onChange={(v) => setHeaderDraft((d) => ({ ...d, receipt_id: v }))}
                    width="w-40"
                  />
                ) : (
                  receipt.receipt_id || '—'
                )}
              </dd>

              <dt className="text-gray-500">Date</dt>
              <dd>
                {headerEditing ? (
                  <input
                    type="date"
                    value={headerDraft.purchase_date || ''}
                    onChange={(e) => setHeaderDraft((d) => ({ ...d, purchase_date: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                ) : (
                  receipt.purchase_date
                )}
              </dd>

              <dt className="text-gray-500">Time</dt>
              <dd>
                {headerEditing ? (
                  <input
                    type="time"
                    value={headerDraft.purchase_time || ''}
                    onChange={(e) => setHeaderDraft((d) => ({ ...d, purchase_time: e.target.value }))}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                ) : (
                  receipt.purchase_time || '—'
                )}
              </dd>

              <dt className="text-gray-500">Subtotal</dt>
              <dd>
                {headerEditing ? (
                  <NumberInput
                    value={headerDraft.total_without_discount}
                    onChange={(v) => setHeaderDraft((d) => ({ ...d, total_without_discount: v }))}
                  />
                ) : (
                  receipt.total_without_discount != null
                    ? `€${Number(receipt.total_without_discount).toFixed(2)}`
                    : '—'
                )}
              </dd>

              <dt className="text-gray-500">Total paid</dt>
              <dd>
                {headerEditing ? (
                  <NumberInput
                    value={headerDraft.total_with_discount}
                    onChange={(v) => setHeaderDraft((d) => ({ ...d, total_with_discount: v }))}
                  />
                ) : (
                  `€${Number(receipt.total_with_discount).toFixed(2)}`
                )}
              </dd>

              <dt className="text-gray-500">Uploaded</dt>
              <dd className="text-gray-800">
                {new Date(receipt.created_at).toLocaleString()}
              </dd>
            </dl>

            {headerError && (
              <p className="text-red-600 text-xs mt-3">{headerError}</p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Lines ({lines.length})</h2>
            </div>
            {lines.length === 0 ? (
              <p className="py-8 text-center text-gray-400 text-sm">No lines.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Name on receipt', 'Item', 'Brand', 'Amount', 'Qty', 'Price', 'Disc', 'Total', ''].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {lines.map((line) => (
                      <LineRow
                        key={line.id}
                        line={line}
                        onSave={(patch) => updateLine(line.id, patch)}
                        onDelete={() => deleteLine(line.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
