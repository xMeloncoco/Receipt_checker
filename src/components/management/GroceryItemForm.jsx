import { useState } from 'react';
import { useItems } from '../../hooks/useItems.js';
import Table from '../ui/Table.jsx';
import Spinner from '../ui/Spinner.jsx';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type', render: (row) => row.type || '—' },
  { key: 'subtype', label: 'Subtype', render: (row) => row.subtype || '—' },
];

export default function GroceryItemForm() {
  const { data, loading, error, addItem } = useItems();
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
      {/* Add form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Item</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Name *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Chicken"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Type</label>
            <input
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              placeholder="e.g. Food"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Subtype</label>
            <input
              value={form.subtype}
              onChange={e => setForm(p => ({ ...p, subtype: e.target.value }))}
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

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <Table columns={columns} rows={data} emptyMessage="No items yet." />
        </div>
      )}
    </div>
  );
}
