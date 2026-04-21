-- ============================================================
-- Receipt Tracker — Anon access policies
--
-- The app currently has no auth layer: the Vite frontend talks to Supabase
-- with the anon key, and the Express server uses the service-role key.  The
-- previous migrations either left RLS disabled (v2) or required an
-- `authenticated` role that no one ever has (v1), so the History / Stores /
-- Items pages came up empty in practice.
--
-- This migration enables RLS on every app table and grants permissive
-- policies to both the `anon` and `authenticated` roles so the browser
-- client can read and mutate data.  The service role continues to bypass
-- RLS entirely.
-- ============================================================

alter table public.stores            enable row level security;
alter table public.items             enable row level security;
alter table public.receipts          enable row level security;
alter table public.receipt_lines     enable row level security;
alter table public.items_per_store   enable row level security;

-- Drop any pre-existing policies from migration 001 that only granted
-- access to the `authenticated` role.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('stores', 'items', 'receipts', 'receipt_lines', 'items_per_store')
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end
$$;

-- Permissive policies: allow anon + authenticated full CRUD.
create policy "anon full access stores"
  on public.stores for all
  to anon, authenticated
  using (true) with check (true);

create policy "anon full access items"
  on public.items for all
  to anon, authenticated
  using (true) with check (true);

create policy "anon full access receipts"
  on public.receipts for all
  to anon, authenticated
  using (true) with check (true);

create policy "anon full access receipt_lines"
  on public.receipt_lines for all
  to anon, authenticated
  using (true) with check (true);

create policy "anon full access items_per_store"
  on public.items_per_store for all
  to anon, authenticated
  using (true) with check (true);

-- The `receipts.user_id` column defaults to auth.uid() which is NULL for
-- anon requests.  Allow that — the server inserts its own placeholder.
alter table public.receipts alter column user_id drop not null;
alter table public.receipts alter column user_id drop default;
