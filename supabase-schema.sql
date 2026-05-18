-- Run this in the Supabase SQL editor (supabase.com → your project → SQL Editor)

create table public.expenses (
  id          uuid primary key,
  user_id     uuid references auth.users not null,
  description text not null,
  amount      numeric(12, 2) not null,
  category    text not null,
  date        date not null,
  created_at  timestamptz default now()
);

-- Only let users see and change their own expenses
alter table public.expenses enable row level security;

create policy "Users manage own expenses"
  on public.expenses
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Speed up per-user queries
create index expenses_user_date on public.expenses (user_id, date desc);

-- Allow real-time subscriptions
alter publication supabase_realtime add table public.expenses;

-- Recurring flag for expenses
alter table public.expenses add column if not exists is_recurring boolean default false;

-- Budgets table: monthly budget limits per category
create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  category    text not null,
  amount      numeric(12, 2) not null,
  created_at  timestamptz default now(),
  unique(user_id, category)
);

alter table public.budgets enable row level security;

create policy "Users manage own budgets"
  on public.budgets
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
