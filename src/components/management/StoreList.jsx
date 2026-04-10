import { useState } from 'react';
import { useStores } from '../../hooks/useStores.js';
import Table from '../ui/Table.jsx';
import Spinner from '../ui/Spinner.jsx';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'chain', label: 'Chain', render: (row) => row.chain || '—' },
  { key: 'location', label: 'Location', render: (row) => row.location || '—' },
  {
    key: 'created_at',
    label: 'Added',
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

export default function StoreList() {
  const { data, loading, error, addStore } = useStores();
  const [form, setForm] = useState({ name: '', chain: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      await addStore({
        name: form.name.trim(),
        chain: form.chain.trim() || null,
        location: form.location.trim() || null,
      });
      setForm({ name: '', chain: '', location: '' });
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
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Store Manually</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Name *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Albert Heijn Oosterstraat"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Chain</label>
            <input
              value={form.chain}
              onChange={e => setForm(p => ({ ...p, chain: e.target.value }))}
              placeholder="e.g. Albert Heijn"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Location</label>
            <input
              value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              placeholder="e.g. Amsterdam"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Add Store'}
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
          <Table columns={columns} rows={data} emptyMessage="No stores yet." />
        </div>
      )}
    </div>
  );
}
