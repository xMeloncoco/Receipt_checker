import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase.js';

export function useStores() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from('stores')
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

  const addStore = useCallback(async ({ name }) => {
    const { data: row, error: err } = await supabase
      .from('stores')
      .insert({ name })
      .select()
      .single();
    if (err) throw err;
    setData((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    return row;
  }, []);

  const updateStore = useCallback(async (id, patch) => {
    const { data: row, error: err } = await supabase
      .from('stores')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    setData((prev) =>
      prev.map((s) => (s.id === id ? row : s)).sort((a, b) => a.name.localeCompare(b.name)),
    );
    return row;
  }, []);

  const deleteStore = useCallback(async (id) => {
    const { error: err } = await supabase.from('stores').delete().eq('id', id);
    if (err) throw err;
    setData((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { data, loading, error, refetch: fetch, addStore, updateStore, deleteStore };
}
