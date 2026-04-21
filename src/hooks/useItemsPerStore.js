import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase.js';

export function useItemsPerStore(storeId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from('items_per_store')
      .select('*, items(id, name, type, subtype)')
      .eq('store_id', storeId)
      .order('name_on_receipt');
    if (err) {
      setError(err.message);
    } else {
      setData(rows);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addEntry = useCallback(async (payload) => {
    const { data: row, error: err } = await supabase
      .from('items_per_store')
      .insert({ ...payload, store_id: storeId })
      .select('*, items(id, name, type, subtype)')
      .single();
    if (err) throw err;
    setData((prev) =>
      [...prev, row].sort((a, b) =>
        a.name_on_receipt.localeCompare(b.name_on_receipt),
      ),
    );
    return row;
  }, [storeId]);

  const updateEntry = useCallback(async (id, patch) => {
    const { data: row, error: err } = await supabase
      .from('items_per_store')
      .update(patch)
      .eq('id', id)
      .select('*, items(id, name, type, subtype)')
      .single();
    if (err) throw err;
    setData((prev) =>
      prev
        .map((r) => (r.id === id ? row : r))
        .sort((a, b) => a.name_on_receipt.localeCompare(b.name_on_receipt)),
    );
    return row;
  }, []);

  const deleteEntry = useCallback(async (id) => {
    const { error: err } = await supabase
      .from('items_per_store')
      .delete()
      .eq('id', id);
    if (err) throw err;
    setData((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetch,
    addEntry,
    updateEntry,
    deleteEntry,
  };
}
