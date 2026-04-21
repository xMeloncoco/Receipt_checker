import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase.js';

export function useItems() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from('items')
      .select('*')
      .order('name');
    if (err) {
      setError(err.message);
    } else {
      setData(rows);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addItem = useCallback(async ({ name, type, subtype }) => {
    const { data: row, error: err } = await supabase
      .from('items')
      .insert({ name, type: type || null, subtype: subtype || null })
      .select()
      .single();
    if (err) throw err;
    setData((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    return row;
  }, []);

  const updateItem = useCallback(async (id, patch) => {
    const { data: row, error: err } = await supabase
      .from('items')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    setData((prev) =>
      prev.map((it) => (it.id === id ? row : it)).sort((a, b) => a.name.localeCompare(b.name)),
    );
    return row;
  }, []);

  const deleteItem = useCallback(async (id) => {
    const { error: err } = await supabase.from('items').delete().eq('id', id);
    if (err) throw err;
    setData((prev) => prev.filter((it) => it.id !== id));
  }, []);

  return { data, loading, error, refetch: fetch, addItem, updateItem, deleteItem };
}
