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

-- Installment support: link expenses that represent a single purchase split over multiple months
alter table public.expenses add column if not exists installment_id    uuid    default null;
alter table public.expenses add column if not exists installment_index integer default null;
alter table public.expenses add column if not exists installment_total integer default null;

create index if not exists expenses_installment_id on public.expenses (installment_id)
  where installment_id is not null;

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

-- AI Advisor run history
create table if not exists public.ai_advisor_runs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  month               text not null,
  analyzed_at         timestamptz default now(),
  corrections_found   int not null default 0,
  corrections_applied int not null default 0
);

alter table public.ai_advisor_runs enable row level security;

create policy "Users manage own ai_advisor_runs"
  on public.ai_advisor_runs
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index ai_advisor_runs_user on public.ai_advisor_runs (user_id, analyzed_at desc);

-- User profiles and roles
create table if not exists public.profiles (
  id         uuid references auth.users primary key,
  email      text not null,
  role       text not null default 'user',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Users can read all profiles (needed for admin view) but only update their own
create policy "Profiles are readable by authenticated users"
  on public.profiles for select
  using (auth.uid() is not null);

create policy "Users manage own profile"
  on public.profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Assign initial admin (run after table creation)
-- INSERT INTO public.profiles (id, email, role)
-- SELECT id, email, 'admin' FROM auth.users WHERE email = 'zainglenn1995@gmail.com'
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';
