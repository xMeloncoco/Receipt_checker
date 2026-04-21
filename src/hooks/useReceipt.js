import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase.js';

export function useReceipt(id) {
  const [receipt, setReceipt] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const { data: rc, error: rErr } = await supabase
      .from('receipts')
      .select('*, stores(id, name)')
      .eq('id', id)
      .maybeSingle();
    if (rErr) {
      setError(rErr.message);
      setLoading(false);
      return;
    }
    setReceipt(rc);

    const { data: ls, error: lErr } = await supabase
      .from('receipt_lines')
      .select('*, items(id, name, type, subtype)')
      .eq('receipt_id', id)
      .order('created_at');
    if (lErr) {
      setError(lErr.message);
    } else {
      setLines(ls || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateReceipt = useCallback(async (patch) => {
    const { data: row, error: err } = await supabase
      .from('receipts')
      .update(patch)
      .eq('id', id)
      .select('*, stores(id, name)')
      .single();
    if (err) throw err;
    setReceipt(row);
    return row;
  }, [id]);

  const deleteReceipt = useCallback(async () => {
    const { error: err } = await supabase.from('receipts').delete().eq('id', id);
    if (err) throw err;
  }, [id]);

  const updateLine = useCallback(async (lineId, patch) => {
    const { data: row, error: err } = await supabase
      .from('receipt_lines')
      .update(patch)
      .eq('id', lineId)
      .select('*, items(id, name, type, subtype)')
      .single();
    if (err) throw err;
    setLines((prev) => prev.map((l) => (l.id === lineId ? row : l)));
    return row;
  }, []);

  const deleteLine = useCallback(async (lineId) => {
    const { error: err } = await supabase
      .from('receipt_lines')
      .delete()
      .eq('id', lineId);
    if (err) throw err;
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  return {
    receipt,
    lines,
    loading,
    error,
    refetch: fetch,
    updateReceipt,
    deleteReceipt,
    updateLine,
    deleteLine,
  };
}
