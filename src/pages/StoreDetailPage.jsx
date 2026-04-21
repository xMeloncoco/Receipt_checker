import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import supabase from '../lib/supabase.js';
import { useItemsPerStore } from '../hooks/useItemsPerStore.js';
import { useItems } from '../hooks/useItems.js';
import Spinner from '../components/ui/Spinner.jsx';

function EditableRow({ row, items, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const start = () => {
    setDraft({
      name_on_receipt: row.name_on_receipt || '',
      brand: row.brand || '',
      amount: row.amount || '',
      price: row.price ?? '',
      item_id: row.item_id || '',
    });
    setEditing(true);
    setError(null);
  };

  const save = async () => {
    if (!draft.name_on_receipt.trim()) {
      setError('Name on receipt is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave({
        name_on_receipt: draft.name_on_receipt.trim(),
        brand: draft.brand.trim() || null,
        amount: draft.amount.trim() || null,
        price: draft.price === '' ? null : Number(draft.price),
        item_id: draft.item_id || null,
      });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!confirm(`Delete "${row.name_on_receipt}" from this store?`)) return;
    setBusy(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const input = (field, placeholder, width, type = 'text') => (
    <input
      type={type}
      step={type === 'number' ? '0.01' : undefined}
      value={draft[field] ?? ''}
      onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
      placeholder={placeholder}
      className={`border border-gray-300 rounded px-2 py-1 text-sm ${width} focus:outline-none focus:ring-2 focus:ring-indigo-300`}
    />
  );

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 align-top text-gray-700">
        {editing ? input('name_on_receipt', 'CHKN FILLET', 'w-40') : row.name_on_receipt}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </td>
      <td className="px-3 py-2 align-top text-gray-700">
        {editing ? (
          <select
            value={draft.item_id || ''}
            onChange={(e) => setDraft((d) => ({ ...d, item_id: e.target.value }))}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">— none —</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>{it.name}</option>
            ))}
          </select>
        ) : (
          row.items?.name || '—'
        )}
      </td>
      <td className="px-3 py-2 align-top text-gray-700">
        {editing ? input('brand', 'AH', 'w-28') : row.brand || '—'}
      </td>
      <td className="px-3 py-2 align-top text-gray-700">
        {editing ? input('amount', '500g', 'w-20') : row.amount || '—'}
      </td>
      <td className="px-3 py-2 align-top text-gray-700">
        {editing ? (
          input('price', '0.00', 'w-20', 'number')
        ) : row.price != null ? (
          `€${Number(row.price).toFixed(2)}`
        ) : (
          '—'
        )}
      </td>
      <td className="px-3 py-2 align-top text-gray-500 text-xs whitespace-nowrap">
        {row.latest_update_date || '—'}
      </td>
      <td className="px-3 py-2 text-right align-top whitespace-nowrap">
        {editing ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={save}
              disabled={busy}
              className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => { setEditing(false); setError(null); }}
              disabled={busy}
              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              onClick={start}
              disabled={busy}
              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Edit
            </button>
            <button
              onClick={del}
              disabled={busy}
              className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function StoreDetailPage() {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState(null);

  const { data: entries, loading, error, addEntry, updateEntry, deleteEntry } =
    useItemsPerStore(id);
  const { data: items } = useItems();

  const [form, setForm] = useState({
    name_on_receipt: '',
    brand: '',
    amount: '',
    price: '',
    item_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStoreLoading(true);
      const { data, error: err } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      if (err) setStoreError(err.message);
      else setStore(data);
      setStoreLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name_on_receipt.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      await addEntry({
        name_on_receipt: form.name_on_receipt.trim(),
        brand: form.brand.trim() || null,
        amount: form.amount.trim() || null,
        price: form.price === '' ? null : Number(form.price),
        item_id: form.item_id || null,
      });
      setForm({ name_on_receipt: '', brand: '', amount: '', price: '', item_id: '' });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (storeLoading) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }
  if (storeError) return <p className="text-red-600 text-sm">{storeError}</p>;
  if (!store) {
    return (
      <div className="space-y-4">
        <p className="text-gray-600">Store not found.</p>
        <Link to="/stores" className="text-indigo-600 hover:underline text-sm">
          &larr; Back to stores
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/stores" className="text-indigo-600 hover:underline text-sm">
          &larr; Back to stores
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{store.name}</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add product to this store</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Name on receipt *</label>
            <input
              required
              value={form.name_on_receipt}
              onChange={(e) => setForm((p) => ({ ...p, name_on_receipt: e.target.value }))}
              placeholder="CHKN FILLET"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Canonical item</label>
            <select
              value={form.item_id}
              onChange={(e) => setForm((p) => ({ ...p, item_id: e.target.value }))}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">— none —</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>{it.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Brand</label>
            <input
              value={form.brand}
              onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
              placeholder="AH"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Amount</label>
            <input
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              placeholder="500g"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Price</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              placeholder="0.00"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Add'}
          </button>
        </form>
        {formError && <p className="text-red-600 text-xs mt-2">{formError}</p>}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-gray-400 text-sm">
          No products linked to this store yet.
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Name on receipt', 'Item', 'Brand', 'Amount', 'Price', 'Updated', ''].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {entries.map((row) => (
                  <EditableRow
                    key={row.id}
                    row={row}
                    items={items}
                    onSave={(patch) => updateEntry(row.id, patch)}
                    onDelete={() => deleteEntry(row.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
