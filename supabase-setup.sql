-- Run this in: Supabase → SQL Editor → New query → Paste → Run

-- Products table
create table if not exists products (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category text not null,
  price integer not null,
  emoji text default '⚽',
  badge text,
  sizes text[] default '{}',
  available boolean default true,
  created_at timestamptz default now()
);

-- Stores table
create table if not exists stores (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  name text,
  whatsapp text,
  description text,
  emoji text default '⚽',
  accent_color text default '#e94560',
  created_at timestamptz default now()
);

-- Row Level Security: each user sees only their own data
alter table products enable row level security;
alter table stores enable row level security;

drop policy if exists "Users manage own products" on products;
create policy "Users manage own products"
  on products for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own store" on stores;
create policy "Users manage own store"
  on stores for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow public catalog to read visible products (needed for index.html)
drop policy if exists "Public read available products" on products;
create policy "Public read available products"
  on products for select
  using (available = true);
