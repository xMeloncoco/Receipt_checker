-- ============================================================
-- Receipt Tracker — Supabase Schema v2
-- Run this in your Supabase SQL editor (Database > SQL Editor)
-- ============================================================

create extension if not exists "pgcrypto";


-- ------------------------------------------------------------
-- STORES
-- ------------------------------------------------------------
create table public.stores (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

comment on table public.stores is 'Supermarket / store names';


-- ------------------------------------------------------------
-- ITEMS  (canonical product catalogue)
-- e.g. name: "Chicken", type: "Food", subtype: "Meat"
-- ------------------------------------------------------------
create table public.items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,             -- e.g. Chicken, Whole milk, Pasta
  type        text,                             -- e.g. Food, Drink, Household
  subtype     text,                             -- e.g. Meat, Dairy, Cleaning
  created_at  timestamptz not null default now()
);

comment on table public.items is 'Canonical product catalogue — store-agnostic';


-- ------------------------------------------------------------
-- RECEIPTS
-- ------------------------------------------------------------
create table public.receipts (
  id                    uuid primary key default gen_random_uuid(),
  receipt_id            text,                   -- receipt number printed on the receipt (optional)
  store_id              uuid not null references public.stores (id) on delete restrict,
  user_id               uuid not null default auth.uid(),
  purchase_date         date not null,
  purchase_time         time,
  total_with_discount   numeric(10, 2) not null, -- amount actually paid
  total_without_discount numeric(10, 2),         -- subtotal before discounts
  image_url             text,                    -- Supabase Storage path
  raw_ai_output         text,                    -- raw JSON from Claude, for debugging
  created_at            timestamptz not null default now(),

  -- Duplicate prevention
  unique (store_id, purchase_date, purchase_time, total_with_discount)
);

comment on table public.receipts is 'One row per scanned receipt';


-- ------------------------------------------------------------
-- RECEIPT LINES
-- ------------------------------------------------------------
create table public.receipt_lines (
  id                  uuid primary key default gen_random_uuid(),
  receipt_line_id     text,                     -- line number / sequence as printed on receipt (optional)
  receipt_id          uuid not null references public.receipts (id) on delete cascade,
  item_id             uuid references public.items (id) on delete set null,
  name_on_receipt     text not null,            -- raw name exactly as printed
  brand               text,
  amount              text,                     -- e.g. "500g", "1.5L", "3 stuks"
  quantity            numeric(10, 3) not null default 1,
  price_per_item      numeric(10, 2),           -- unit price before discount
  discount_per_item   numeric(10, 2) default 0,
  total_discount      numeric(10, 2) default 0,
  price_total         numeric(10, 2),           -- final line total (after discount)
  created_at          timestamptz not null default now()
);

comment on table public.receipt_lines is 'Individual line items on a receipt';


-- ------------------------------------------------------------
-- ITEMS PER STORE  (store-specific product info + price tracking)
-- Keyed on (name_on_receipt, store_id) — one row per product per store.
-- Updated in place when a newer receipt is scanned.
-- ------------------------------------------------------------
create table public.items_per_store (
  id                        uuid primary key default gen_random_uuid(),
  store_id                  uuid not null references public.stores (id) on delete cascade,
  item_id                   uuid references public.items (id) on delete set null,
  name_on_receipt           text not null,      -- raw name as used on this store's receipts
  brand                     text,
  amount                    text,               -- e.g. "500g", "1.5L"
  price                     numeric(10, 2),     -- most recent price seen
  latest_update_date        date,               -- date of the receipt that last updated this row
  latest_update_receipt_line_id uuid references public.receipt_lines (id) on delete set null,
  created_at                timestamptz not null default now(),

  unique (store_id, name_on_receipt)
);

comment on table public.items_per_store is 'Per-store product catalogue with latest known price';


-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
create index on public.receipts        (user_id);
create index on public.receipts        (store_id, purchase_date);
create index on public.receipt_lines   (receipt_id);
create index on public.receipt_lines   (item_id);
create index on public.items_per_store (store_id);
create index on public.items_per_store (item_id);
