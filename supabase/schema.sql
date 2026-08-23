-- ============================================================================
-- MoneyOS — Supabase schema (v1, card T2a)
-- ----------------------------------------------------------------------------
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → New query → paste THIS WHOLE FILE → Run.
--   Safe to re-run (idempotent: IF NOT EXISTS / OR REPLACE everywhere).
--
-- WHAT IT CREATES
--   Tables     : profiles, categories, transactions, ledger_entries,
--                emis, emi_installments, budgets, recurring_transactions
--   Triggers   : updated_at maintenance on every table;
--                on_signup → creates profile + seeds default categories
--   RLS        : every table locked to auth.uid(); no cross-user access.
--
-- MONEY CONVENTIONS (binding — mirrors src/data/repository.js)
--   - All *_minor columns are INTEGER MINOR UNITS (paise). Never floats.
--   - Multi-currency rows snapshot fx at ENTRY time:
--       { <amount>_minor, currency, fx_rate_to_inr, <amount>_inr_minor }
--     fx fetched once from https://open.er-api.com/v6/latest/USD only when
--     currency ≠ 'INR'; INR rows keep fx_rate_to_inr = 1.
--   - Display currency is ALWAYS INR → sums/aggregations read the *_inr_minor
--     columns only. Ledger settlements accumulate in settled_inr_minor (INR).
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1) Shared helper functions
-- ============================================================================

-- Maintain updated_at on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Fires on auth.users INSERT (Supabase Auth signup, Google included):
-- creates the matching profile row AND seeds that user's default categories.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1),
      'MoneyOS user'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  -- Default categories, seeded per-user (no global/shared rows — RLS-safe).
  insert into public.categories (user_id, name, kind, color, icon, sort_order)
  select
    new.id, c.name, c.kind, c.color, c.icon, c.sort_order
  from (values
    -- expenses
    ('Food & Dining',   'expense', '#F43F5E', 'utensils',        10),
    ('Groceries',       'expense', '#F97316', 'shopping-basket', 20),
    ('Transport',       'expense', '#0EA5E9', 'car',             30),
    ('Rent',            'expense', '#8B5CF6', 'home',            40),
    ('Utilities',       'expense', '#06B6D4', 'plug',            50),
    ('Shopping',        'expense', '#EC4899', 'shopping-bag',    60),
    ('Entertainment',   'expense', '#A855F7', 'clapperboard',    70),
    ('Health',          'expense', '#10B981', 'heart-pulse',     80),
    ('Travel',          'expense', '#14B8A6', 'plane',           90),
    ('Education',       'expense', '#6366F1', 'graduation-cap', 100),
    ('Subscriptions',   'expense', '#F59E0B', 'repeat',         110),
    ('EMI',             'expense', '#F59E0B', 'landmark',       120),
    ('Other',           'expense', '#94A3B8', 'circle-ellipsis',130),
    -- income
    ('Salary',          'income',  '#10B981', 'banknote',       200),
    ('Freelance',       'income',  '#22C55E', 'laptop',         210),
    ('Interest',        'income',  '#84CC16', 'percent',        220),
    ('Gifts',           'income',  '#EAB308', 'gift',           230),
    ('Other Income',    'income',  '#94A3B8', 'circle-plus',    240)
  ) as c(name, kind, color, icon, sort_order);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2) Tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles — one row per Google-authenticated user (auto-created on signup).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  email            text,
  display_name     text,
  avatar_url       text,
  default_currency text    not null default 'INR' check (default_currency ~ '^[A-Z]{3}$'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories — user-scoped expense/income categories (defaults auto-seeded).
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  kind       text not null default 'expense' check (kind in ('expense', 'income')),
  color      text,
  icon       text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, kind)
);

-- ---------------------------------------------------------------------------
-- transactions — expenses & income (spends ledger).
-- Money: amount_minor in `currency`; inr_amount_minor is the display value.
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  type              text not null default 'expense' check (type in ('expense', 'income')),
  category_id       uuid references public.categories (id) on delete set null,
  amount_minor      bigint not null check (amount_minor > 0),
  currency          text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  fx_rate_to_inr    numeric(18, 8) not null default 1 check (fx_rate_to_inr > 0),
  inr_amount_minor  bigint not null check (inr_amount_minor >= 0),
  note_date         date not null default current_date,
  description       text,
  payment_method    text,
  source            text not null default 'manual' check (source in ('manual', 'recurring')),
  recurring_rule_id uuid,  -- FK added after recurring_transactions exists
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ledger_entries — borrow / lent against counterparties.
-- Principal snapshotted at entry time (native + INR). Settlements accumulate
-- in settled_inr_minor; entry counts as OPEN while settled < principal (INR).
-- ---------------------------------------------------------------------------
create table if not exists public.ledger_entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  type               text not null check (type in ('borrow', 'lent')),
  counterparty       text not null,
  principal_minor    bigint not null check (principal_minor > 0),
  currency           text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  fx_rate_to_inr     numeric(18, 8) not null default 1 check (fx_rate_to_inr > 0),
  principal_inr_minor bigint not null check (principal_inr_minor > 0),
  settled_inr_minor  bigint not null default 0
                     check (settled_inr_minor >= 0
                            and settled_inr_minor <= principal_inr_minor),
  entry_date         date not null default current_date,
  due_date           date,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- emis — loan master record + its monthly installment amount.
-- ---------------------------------------------------------------------------
create table if not exists public.emis (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  name                 text not null,
  lender               text,
  principal_minor      bigint not null check (principal_minor > 0),
  currency             text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  fx_rate_to_inr       numeric(18, 8) not null default 1 check (fx_rate_to_inr > 0),
  principal_inr_minor  bigint not null check (principal_inr_minor > 0),
  interest_rate_pa     numeric(5, 2) check (interest_rate_pa >= 0),
  tenure_months        integer not null check (tenure_months > 0),
  emi_amount_minor     bigint not null check (emi_amount_minor > 0),
  emi_inr_amount_minor bigint not null check (emi_inr_amount_minor > 0),
  start_date           date not null,
  next_due_date        date not null,
  active               boolean not null default true,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- emi_installments — payments made against an EMI (history + progress).
-- ---------------------------------------------------------------------------
create table if not exists public.emi_installments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  emi_id           uuid not null references public.emis (id) on delete cascade,
  paid_minor       bigint not null check (paid_minor > 0),
  currency         text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  fx_rate_to_inr   numeric(18, 8) not null default 1 check (fx_rate_to_inr > 0),
  paid_inr_minor   bigint not null check (paid_inr_minor > 0),
  paid_on          date not null default current_date,
  late             boolean not null default false,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- budgets — per-category monthly cap in INR. `month` = first day of month.
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  category_id         uuid not null references public.categories (id) on delete cascade,
  month               date not null check (month = (date_trunc('month', month))::date),
  limit_inr_minor     bigint not null check (limit_inr_minor > 0),
  alert_threshold_pct integer not null default 80 check (alert_threshold_pct between 1 and 100),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, category_id, month)
);

-- ---------------------------------------------------------------------------
-- recurring_transactions — rules that auto-generate transactions.
-- ---------------------------------------------------------------------------
create table if not exists public.recurring_transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  title            text not null,
  category_id      uuid references public.categories (id) on delete set null,
  type             text not null default 'expense' check (type in ('expense', 'income')),
  amount_minor     bigint not null check (amount_minor > 0),
  currency         text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  fx_rate_to_inr   numeric(18, 8) not null default 1 check (fx_rate_to_inr > 0),
  inr_amount_minor bigint not null check (inr_amount_minor > 0),
  frequency        text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  interval_count   integer not null default 1 check (interval_count > 0),
  next_run_date    date not null,
  end_date         date,
  last_run_at      timestamptz,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Late-bound FK: transactions ← recurring_transactions (avoids circular DDL).
alter table public.transactions
  drop constraint if exists transactions_recurring_rule_fk;
alter table public.transactions
  add constraint transactions_recurring_rule_fk
  foreign key (recurring_rule_id) references public.recurring_transactions (id)
  on delete set null;

-- ============================================================================
-- 3) Indexes (all queries are per-user first)
-- ============================================================================

create index if not exists idx_categories_user
  on public.categories (user_id, kind, sort_order);

create index if not exists idx_txns_user_date
  on public.transactions (user_id, note_date desc);
create index if not exists idx_txns_user_category
  on public.transactions (user_id, category_id);
create index if not exists idx_txns_user_type_date
  on public.transactions (user_id, type, note_date desc);
create index if not exists idx_txns_recurring_rule
  on public.transactions (recurring_rule_id) where recurring_rule_id is not null;

create index if not exists idx_ledger_user_type_date
  on public.ledger_entries (user_id, type, entry_date desc);
-- Open (unsettled) borrow/lent entries only — dashboard balances scan.
create index if not exists idx_ledger_open
  on public.ledger_entries (user_id, type)
  where settled_inr_minor < principal_inr_minor;

create index if not exists idx_emis_user_active
  on public.emis (user_id, active, next_due_date);

create index if not exists idx_installments_emi_paid_on
  on public.emi_installments (user_id, emi_id, paid_on desc);

create index if not exists idx_budgets_user_month
  on public.budgets (user_id, month desc);

create index if not exists idx_recurring_user_next_run
  on public.recurring_transactions (user_id, active, next_run_date);

-- ============================================================================
-- 4) updated_at triggers (every table)
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'categories', 'transactions', 'ledger_entries',
    'emis', 'emi_installments', 'budgets', 'recurring_transactions'
  ]
  loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%s_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t, t);
  end loop;
end;
$$;

-- ============================================================================
-- 5) Row Level Security — hard lock to the owning auth.uid()
--    NOTE: `(select auth.uid())` wraps the call so Postgres evaluates it once
--    per statement (initplan) instead of once per row.
-- ============================================================================

alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.transactions           enable row level security;
alter table public.ledger_entries         enable row level security;
alter table public.emis                   enable row level security;
alter table public.emi_installments       enable row level security;
alter table public.budgets                enable row level security;
alter table public.recurring_transactions enable row level security;

-- profiles: read/update your own row. INSERT is done by the SECURITY DEFINER
-- signup trigger; DELETE cascades from auth.users. No user-facing policies
-- for those two operations by design.

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Every domain table: identical all-operations ownership policy.
do $$
declare t text;
begin
  foreach t in array array[
    'categories', 'transactions', 'ledger_entries',
    'emis', 'emi_installments', 'budgets', 'recurring_transactions'
  ]
  loop
    execute format('drop policy if exists %s_owner_all on public.%I', t, t);
    execute format(
      'create policy %s_owner_all on public.%I
       for all to authenticated
       using (user_id = (select auth.uid()))
       with check (user_id = (select auth.uid()))', t, t);
  end loop;
end;
$$;

-- ============================================================================
-- Done. Verify in Table Editor: 8 tables under public, all showing
-- "RLS enabled". Sign up with Google once → profile + 18 default categories
-- appear automatically for that user.
-- ============================================================================
