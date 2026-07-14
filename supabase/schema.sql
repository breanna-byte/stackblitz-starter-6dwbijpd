-- FieldLedger ERP schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent (create-if-not-exists /
-- drop-if-exists), so re-running this after schema changes just applies
-- the delta instead of erroring on things that already exist.

create extension if not exists "pgcrypto";

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  name text not null,
  email text,
  phone text,
  address text,
  created_at timestamptz default now()
);

create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  client_id uuid references clients(id) on delete set null,
  title text not null default 'Untitled estimate',
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined')),
  tax_rate numeric not null default 0,
  global_discount numeric not null default 0,
  -- line items live as jsonb: [{id,type,description,qty,unitCost,markup,taxable}, ...]
  -- keeping the calculator's line items together in one column avoids a
  -- join-heavy schema and matches how the estimate is always read/written
  -- as a whole document in the UI.
  items jsonb not null default '[]',
  created_at timestamptz default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  estimate_id uuid references estimates(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','complete')),
  start_date date,
  end_date date,
  -- shared by every generated occurrence of a recurring job; null for
  -- one-off jobs. See src/lib/recurrence.js.
  series_id uuid,
  created_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  estimate_id uuid references estimates(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','sent','paid','overdue')),
  issued_at date default now(),
  due_at date,
  amount numeric,
  deposit_pct numeric default 0,
  -- shared by every generated occurrence of a recurring invoice (e.g. a
  -- monthly retainer); null for one-off invoices.
  series_id uuid,
  created_at timestamptz default now()
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  title text not null,
  done boolean not null default false,
  due_date date,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  title text not null,
  date date not null,
  time time,
  client_id uuid references clients(id) on delete set null,
  created_at timestamptz default now()
);

-- Covers income, expenses, and bills in one table (see src/lib/finance.js).
-- receipt_image stores a data URL from the Receipt Ledger photo scan; for
-- production use, swap this for a Supabase Storage bucket + public URL
-- instead of storing base64 image data in a text/jsonb column.
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  type text not null check (type in ('income','expense','bill')),
  category text not null default 'Other',
  vendor_or_source text,
  amount numeric not null default 0,
  date date not null default current_date,
  due_date date,
  status text not null default 'recorded' check (status in ('recorded','unpaid','paid')),
  receipt_image text,
  notes text,
  client_id uuid references clients(id) on delete set null,
  created_at timestamptz default now()
);

-- Per-person PDF branding / business-info preferences. Unlike every table
-- above (shared across the whole team, see the RLS policies below), this
-- one is intentionally private to each signed-in user — one row per
-- account, keyed by user_id instead of a generated id.
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  tagline text,
  logo text,
  address text,
  phone text,
  email text,
  website text,
  accent_color text,
  currency_symbol text,
  estimate_terms text,
  invoice_terms text,
  footer_note text,
  updated_at timestamptz default now()
);

-- Safe to re-run: adds series_id to projects that ran an earlier version of
-- this schema before recurring jobs/invoices existed.
alter table jobs add column if not exists series_id uuid;
alter table invoices add column if not exists series_id uuid;

-- Row Level Security.
alter table clients enable row level security;
alter table estimates enable row level security;
alter table jobs enable row level security;
alter table invoices enable row level security;
alter table todos enable row level security;
alter table events enable row level security;
alter table transactions enable row level security;
alter table user_settings enable row level security;

-- Business data is a shared team workspace: any signed-in user (you and
-- your business partner) can see and edit every record, not just the ones
-- they personally created. The `owner` column is kept as a "created by"
-- audit trail, but access no longer depends on it.
drop policy if exists "owner can manage clients" on clients;
drop policy if exists "team can manage clients" on clients;
create policy "team can manage clients" on clients
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "owner can manage estimates" on estimates;
drop policy if exists "team can manage estimates" on estimates;
create policy "team can manage estimates" on estimates
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "owner can manage jobs" on jobs;
drop policy if exists "team can manage jobs" on jobs;
create policy "team can manage jobs" on jobs
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "owner can manage invoices" on invoices;
drop policy if exists "team can manage invoices" on invoices;
create policy "team can manage invoices" on invoices
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "owner can manage todos" on todos;
drop policy if exists "team can manage todos" on todos;
create policy "team can manage todos" on todos
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "owner can manage events" on events;
drop policy if exists "team can manage events" on events;
create policy "team can manage events" on events
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "owner can manage transactions" on transactions;
drop policy if exists "team can manage transactions" on transactions;
create policy "team can manage transactions" on transactions
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- user_settings is the one exception: private per-person preferences, so
-- access stays restricted to the owning user.
drop policy if exists "user manages own settings" on user_settings;
create policy "user manages own settings" on user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
