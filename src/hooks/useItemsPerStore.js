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

  return { data, loading, error, refetch: fetch };
}
