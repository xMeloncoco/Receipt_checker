import { useState } from 'react';
import { useItems } from '../../hooks/useItems.js';
import Spinner from '../ui/Spinner.jsx';

function EditableRow({ item, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: item.name,
    type: item.type || '',
    subtype: item.subtype || '',
  });
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState(null);

  const cancel = () => {
    setEditing(false);
    setForm({ name: item.name, type: item.type || '', subtype: item.subtype || '' });
    setRowError(null);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setRowError('Name is required');
      return;
    }
    setBusy(true);
    setRowError(null);
    try {
      await onSave({
        name: form.name.trim(),
        type: form.type.trim() || null,
        subtype: form.subtype.trim() || null,
      });
      setEditing(false);
    } catch (err) {
      setRowError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!confirm(`Delete item "${item.name}"?`)) return;
    setBusy(true);
    setRowError(null);
    try {
      await onDelete();
    } catch (err) {
      setRowError(err.message);
      setBusy(false);
    }
  };

  const input = (field, placeholder, width) => (
    <input
      value={form[field]}
      onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
      placeholder={placeholder}
      className={`border border-gray-300 rounded px-2 py-1 text-sm ${width} focus:outline-none focus:ring-2 focus:ring-indigo-300`}
    />
  );

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2 text-gray-700 align-top">
        {editing ? input('name', 'Chicken', 'w-40') : item.name}
        {rowError && <p className="text-xs text-red-600 mt-1">{rowError}</p>}
      </td>
      <td className="px-4 py-2 text-gray-700 align-top">
        {editing ? input('type', 'Food', 'w-28') : item.type || '—'}
      </td>
      <td className="px-4 py-2 text-gray-700 align-top">
        {editing ? input('subtype', 'Meat', 'w-28') : item.subtype || '—'}
      </td>
      <td className="px-4 py-2 text-right align-top whitespace-nowrap">
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
              onClick={cancel}
              disabled={busy}
              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(true)}
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

export default function GroceryItemForm() {
  const { data, loading, error, addItem, updateItem, deleteItem } = useItems();
  const [form, setForm] = useState({ name: '', type: '', subtype: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      await addItem({
        name: form.name.trim(),
        type: form.type.trim() || null,
        subtype: form.subtype.trim() || null,
      });
      setForm({ name: '', type: '', subtype: '' });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Item</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Chicken"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Type</label>
            <input
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              placeholder="e.g. Food"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Subtype</label>
            <input
              value={form.subtype}
              onChange={(e) => setForm((p) => ({ ...p, subtype: e.target.value }))}
              placeholder="e.g. Meat"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Add Item'}
          </button>
        </form>
        {formError && <p className="text-red-600 text-xs mt-2">{formError}</p>}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : data.length === 0 ? (
        <p className="py-8 text-center text-gray-400 text-sm">No items yet.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtype</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {data.map((item) => (
                  <EditableRow
                    key={item.id}
                    item={item}
                    onSave={(patch) => updateItem(item.id, patch)}
                    onDelete={() => deleteItem(item.id)}
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
