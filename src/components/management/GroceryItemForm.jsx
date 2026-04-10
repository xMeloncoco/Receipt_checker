import { useState } from 'react';
import { useGroceryItems } from '../../hooks/useGroceryItems.js';
import Table from '../ui/Table.jsx';
import Spinner from '../ui/Spinner.jsx';

const columns = [
  { key: 'canonical_name', label: 'Name' },
  { key: 'category', label: 'Category', render: (row) => row.category || '—' },
  { key: 'unit_type', label: 'Unit Type', render: (row) => row.unit_type || '—' },
];

export default function GroceryItemForm() {
  const { data, loading, error, addItem } = useGroceryItems();
  const [form, setForm] = useState({ canonical_name: '', category: '', unit_type: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.canonical_name.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      await addItem({
        canonical_name: form.canonical_name.trim(),
        category: form.category.trim() || null,
        unit_type: form.unit_type.trim() || null,
      });
      setForm({ canonical_name: '', category: '', unit_type: '' });
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
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Grocery Item</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Canonical Name *</label>
            <input
              required
              value={form.canonical_name}
              onChange={e => setForm(p => ({ ...p, canonical_name: e.target.value }))}
              placeholder="e.g. Whole Milk"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Category</label>
            <input
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              placeholder="e.g. Dairy"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Unit Type</label>
            <input
              value={form.unit_type}
              onChange={e => setForm(p => ({ ...p, unit_type: e.target.value }))}
              placeholder="e.g. l / kg / piece"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Add Item'}
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
          <Table columns={columns} rows={data} emptyMessage="No grocery items yet." />
        </div>
      )}
    </div>
  );
}
