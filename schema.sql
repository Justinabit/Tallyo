-- ============================================================================
-- TALLYO — Supabase Database Schema
-- ============================================================================
-- This script is SAFE to run on a brand new Supabase project.
-- It creates every table, index, trigger and Row Level Security (RLS)
-- policy that the Tallyo web app needs.
--
-- HOW TO USE:
--   1. Open your Supabase project.
--   2. Go to "SQL Editor" in the left sidebar.
--   3. Click "New Query".
--   4. Paste the ENTIRE contents of this file.
--   5. Click "Run".
--
-- This script does NOT contain any DROP TABLE statements. It uses
-- "CREATE TABLE IF NOT EXISTS" everywhere so it will not destroy any
-- existing data if you accidentally run it twice.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------------------
-- Supabase already ships with the "uuid-ossp"/"pgcrypto" extensions enabled
-- on most projects, but we make sure gen_random_uuid() is available.
create extension if not exists "pgcrypto";


-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------------------
-- One row per authenticated user. Linked 1-to-1 with Supabase's built-in
-- auth.users table. Created automatically by a trigger (see section 11).
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Public profile information for each authenticated user.';


-- ----------------------------------------------------------------------------
-- 2. USER PREFERENCES
-- ----------------------------------------------------------------------------
-- Stores app-wide settings per user (currency, theme, default budget period).
create table if not exists public.user_preferences (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users(id) on delete cascade,
  currency               text not null default 'PHP',
  theme                  text not null default 'system' check (theme in ('light','dark','system')),
  budget_period_default  text not null default 'monthly' check (budget_period_default in ('weekly','monthly','yearly','custom')),
  notifications_enabled  boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 3. CATEGORIES
-- ----------------------------------------------------------------------------
-- Categories can be:
--   - "default" categories shared by every user (user_id IS NULL)
--   - "custom" categories created by a single user (user_id = that user)
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade, -- NULL = default/shared category
  name        text not null,
  type        text not null check (type in ('income','expense')),
  icon        text not null default 'fa-circle',
  color       text not null default '#e11d2e',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, name, type)
);

create index if not exists idx_categories_user_id on public.categories(user_id);


-- ----------------------------------------------------------------------------
-- 4. WALLETS
-- ----------------------------------------------------------------------------
create table if not exists public.wallets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  type             text not null default 'cash' check (type in ('cash','bank','ewallet','savings','other')),
  initial_balance  numeric(14,2) not null default 0,
  currency         text not null default 'PHP',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_wallets_user_id on public.wallets(user_id);


-- ----------------------------------------------------------------------------
-- 5. TRANSACTIONS
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  wallet_id         uuid references public.wallets(id) on delete set null,
  category_id       uuid references public.categories(id) on delete set null,
  type              text not null check (type in ('income','expense')),
  amount            numeric(14,2) not null check (amount > 0),
  description       text,
  notes             text,
  transaction_date  date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_date on public.transactions(transaction_date);
create index if not exists idx_transactions_wallet_id on public.transactions(wallet_id);
create index if not exists idx_transactions_category_id on public.transactions(category_id);


-- ----------------------------------------------------------------------------
-- 6. BUDGETS
-- ----------------------------------------------------------------------------
create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  amount      numeric(14,2) not null check (amount > 0),
  period      text not null default 'monthly' check (period in ('weekly','monthly','yearly','custom')),
  start_date  date not null default current_date,
  end_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index if not exists idx_budgets_user_id on public.budgets(user_id);


-- ----------------------------------------------------------------------------
-- 7. BUDGET <-> CATEGORY LINK TABLE
-- ----------------------------------------------------------------------------
-- A budget with NO rows here applies to ALL spending categories.
-- A budget WITH rows here only tracks spending in those specific categories.
create table if not exists public.budget_categories (
  id           uuid primary key default gen_random_uuid(),
  budget_id    uuid not null references public.budgets(id) on delete cascade,
  category_id  uuid not null references public.categories(id) on delete cascade,
  unique (budget_id, category_id)
);

create index if not exists idx_budget_categories_budget_id on public.budget_categories(budget_id);


-- ----------------------------------------------------------------------------
-- 8. SAVINGS GOALS
-- ----------------------------------------------------------------------------
create table if not exists public.savings_goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  target_amount   numeric(14,2) not null check (target_amount > 0),
  current_amount  numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date     date,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_savings_goals_user_id on public.savings_goals(user_id);


-- ----------------------------------------------------------------------------
-- 9. RECURRING TRANSACTIONS
-- ----------------------------------------------------------------------------
create table if not exists public.recurring_transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  type           text not null check (type in ('income','expense')),
  amount         numeric(14,2) not null check (amount > 0),
  category_id    uuid references public.categories(id) on delete set null,
  wallet_id      uuid references public.wallets(id) on delete set null,
  description    text,
  frequency      text not null check (frequency in ('daily','weekly','monthly','yearly')),
  start_date     date not null default current_date,
  end_date       date,
  next_run_date  date not null default current_date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index if not exists idx_recurring_user_id on public.recurring_transactions(user_id);
create index if not exists idx_recurring_next_run on public.recurring_transactions(next_run_date);


-- ----------------------------------------------------------------------------
-- 10. UPCOMING EXPENSES
-- ----------------------------------------------------------------------------
create table if not exists public.upcoming_expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  amount       numeric(14,2) not null check (amount > 0),
  due_date     date not null,
  category_id  uuid references public.categories(id) on delete set null,
  status       text not null default 'pending' check (status in ('pending','paid','overdue')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_upcoming_user_id on public.upcoming_expenses(user_id);
create index if not exists idx_upcoming_due_date on public.upcoming_expenses(due_date);


-- ----------------------------------------------------------------------------
-- 11. AUTO-CREATE PROFILE + PREFERENCES WHEN A NEW USER SIGNS UP
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  insert into public.user_preferences (user_id)
  values (new.id);

  -- give every new user their own copy of a default "Cash" wallet
  insert into public.wallets (user_id, name, type, initial_balance)
  values (new.id, 'Cash', 'cash', 0);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 12. AUTO-UPDATE "updated_at" TIMESTAMPS
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.user_preferences;
create trigger set_updated_at before update on public.user_preferences
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.wallets;
create trigger set_updated_at before update on public.wallets
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.transactions;
create trigger set_updated_at before update on public.transactions
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.budgets;
create trigger set_updated_at before update on public.budgets
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.savings_goals;
create trigger set_updated_at before update on public.savings_goals
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.recurring_transactions;
create trigger set_updated_at before update on public.recurring_transactions
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.upcoming_expenses;
create trigger set_updated_at before update on public.upcoming_expenses
  for each row execute procedure public.set_updated_at();


-- ----------------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY — enable on every table
-- ----------------------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.user_preferences         enable row level security;
alter table public.categories               enable row level security;
alter table public.wallets                  enable row level security;
alter table public.transactions             enable row level security;
alter table public.budgets                  enable row level security;
alter table public.budget_categories        enable row level security;
alter table public.savings_goals            enable row level security;
alter table public.recurring_transactions   enable row level security;
alter table public.upcoming_expenses        enable row level security;


-- ----------------------------------------------------------------------------
-- 14. RLS POLICIES — a user can ONLY ever see/edit their own data
-- ----------------------------------------------------------------------------

-- PROFILES: user can read & update only their own profile row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- USER_PREFERENCES
drop policy if exists "prefs_select_own" on public.user_preferences;
create policy "prefs_select_own" on public.user_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "prefs_insert_own" on public.user_preferences;
create policy "prefs_insert_own" on public.user_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "prefs_update_own" on public.user_preferences;
create policy "prefs_update_own" on public.user_preferences
  for update using (auth.uid() = user_id);

-- CATEGORIES: everyone can see default categories (user_id is null) plus
-- their own custom ones. Users may only write their OWN custom categories.
drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories
  for select using (user_id is null or auth.uid() = user_id);

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id);

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

-- WALLETS
drop policy if exists "wallets_all_own" on public.wallets;
create policy "wallets_all_own" on public.wallets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- TRANSACTIONS
drop policy if exists "transactions_all_own" on public.transactions;
create policy "transactions_all_own" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- BUDGETS
drop policy if exists "budgets_all_own" on public.budgets;
create policy "budgets_all_own" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- BUDGET_CATEGORIES: access granted only if the parent budget belongs to the user
drop policy if exists "budget_categories_all_own" on public.budget_categories;
create policy "budget_categories_all_own" on public.budget_categories
  for all using (
    exists (select 1 from public.budgets b where b.id = budget_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.budgets b where b.id = budget_id and b.user_id = auth.uid())
  );

-- SAVINGS_GOALS
drop policy if exists "savings_all_own" on public.savings_goals;
create policy "savings_all_own" on public.savings_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- RECURRING_TRANSACTIONS
drop policy if exists "recurring_all_own" on public.recurring_transactions;
create policy "recurring_all_own" on public.recurring_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- UPCOMING_EXPENSES
drop policy if exists "upcoming_all_own" on public.upcoming_expenses;
create policy "upcoming_all_own" on public.upcoming_expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 15. DEFAULT / SHARED CATEGORIES
-- ----------------------------------------------------------------------------
-- These are visible to every user (user_id is NULL) and cannot be edited or
-- deleted by regular users (the write policies above require user_id = auth.uid()).
insert into public.categories (user_id, name, type, icon, color, is_default)
select null, name, type, icon, color, true
from (values
  ('Food',            'expense', 'fa-utensils',       '#e11d2e'),
  ('Transportation',  'expense', 'fa-car',             '#f5a623'),
  ('Bills',           'expense', 'fa-file-invoice',    '#6b7280'),
  ('Shopping',        'expense', 'fa-bag-shopping',    '#a855f7'),
  ('Entertainment',   'expense', 'fa-film',            '#3b82f6'),
  ('Education',       'expense', 'fa-graduation-cap',  '#10b981'),
  ('Health',          'expense', 'fa-heart-pulse',     '#ef4444'),
  ('Other',           'expense', 'fa-ellipsis',        '#6b7280'),
  ('Salary',          'income',  'fa-briefcase',       '#10b981'),
  ('Allowance',       'income',  'fa-hand-holding-dollar','#22c55e'),
  ('Gift',            'income',  'fa-gift',            '#f59e0b'),
  ('Other Income',    'income',  'fa-circle-plus',     '#10b981')
) as t(name, type, icon, color)
where not exists (
  select 1 from public.categories c where c.user_id is null and c.name = t.name and c.type = t.type
);

-- ============================================================================
-- END OF SCHEMA — Tallyo is ready. 🎉
-- ============================================================================