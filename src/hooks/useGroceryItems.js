import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase.js';

export function useGroceryItems() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase
      .from('grocery_items')
      .select('*')
      .order('canonical_name');
    if (err) {
      setError(err.message);
    } else {
      setData(rows);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addItem = useCallback(async ({ canonical_name, category, unit_type }) => {
    const { data: row, error: err } = await supabase
      .from('grocery_items')
      .insert({ canonical_name, category, unit_type })
      .select()
      .single();
    if (err) throw err;
    setData(prev => [...prev, row].sort((a, b) => a.canonical_name.localeCompare(b.canonical_name)));
    return row;
  }, []);

  return { data, loading, error, refetch: fetch, addItem };
}
