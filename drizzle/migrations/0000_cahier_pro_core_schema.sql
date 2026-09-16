-- =========================================================
-- CAHIER PRO — schéma de base
-- =========================================================

create table public.profiles (
  id uuid primary key,
  full_name text,
  business_name text,
  phone text,
  logo_url text,
  currency text not null default 'HTG',
  date_format text not null default 'dd/MM/yyyy',
  theme text not null default 'system',
  notifications_enabled boolean not null default true,
  opening_cash numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles own select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles own insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles own update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Compteurs de numéros de documents
create table public.doc_counters (
  user_id uuid not null,
  prefix text not null,
  year int not null,
  seq int not null default 0,
  primary key (user_id, prefix, year)
);
grant select on public.doc_counters to authenticated;
grant all on public.doc_counters to service_role;
alter table public.doc_counters enable row level security;
create policy "counters own select" on public.doc_counters for select to authenticated using (user_id = auth.uid());

create or replace function public.next_doc_number(_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _year int := extract(year from now())::int;
  _seq int;
begin
  if _uid is null then raise exception 'Non authentifié'; end if;
  insert into public.doc_counters(user_id, prefix, year, seq)
  values (_uid, _prefix, _year, 1)
  on conflict (user_id, prefix, year)
  do update set seq = public.doc_counters.seq + 1
  returning seq into _seq;
  return _prefix || '-' || _year || '-' || lpad(_seq::text, 6, '0');
end;
$$;
grant execute on function public.next_doc_number(text) to authenticated;

-- =========================== CLIENTS ===========================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  code text,
  name text not null,
  phone text,
  whatsapp text,
  address text,
  note text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.customers(user_id);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "customers own" on public.customers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ========================= FOURNISSEURS =========================
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  phone text,
  whatsapp text,
  address text,
  note text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.suppliers(user_id);
grant select, insert, update, delete on public.suppliers to authenticated;
grant all on public.suppliers to service_role;
alter table public.suppliers enable row level security;
create policy "suppliers own" on public.suppliers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================== PRODUITS ===========================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  sku text,
  category text,
  description text,
  cost_price numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,
  stock numeric(14,3) not null default 0,
  min_stock numeric(14,3) not null default 0,
  track_stock boolean not null default true,
  unit text not null default 'unité',
  supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'active',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.products(user_id);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products own" on public.products for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================ VENTES ============================
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  number text not null,
  customer_id uuid references public.customers(id) on delete set null,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  cogs numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  refunded numeric(14,2) not null default 0,
  payment_method text,
  note text,
  status text not null default 'completed',
  sale_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.sales(user_id, sale_date desc);
grant select, insert, update on public.sales to authenticated;
grant all on public.sales to service_role;
alter table public.sales enable row level security;
create policy "sales own" on public.sales for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  unit_cost numeric(14,2) not null default 0,
  line_total numeric(14,2) not null,
  returned_quantity numeric(14,3) not null default 0
);
create index on public.sale_items(sale_id);
grant select, insert, update on public.sale_items to authenticated;
grant all on public.sale_items to service_role;
alter table public.sale_items enable row level security;
create policy "sale_items own" on public.sale_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================== ACHATS ===========================
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  number text not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  total numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  payment_method text,
  note text,
  status text not null default 'completed',
  purchase_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.purchases(user_id, purchase_date desc);
grant select, insert, update on public.purchases to authenticated;
grant all on public.purchases to service_role;
alter table public.purchases enable row level security;
create policy "purchases own" on public.purchases for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity numeric(14,3) not null,
  unit_cost numeric(14,2) not null,
  line_total numeric(14,2) not null
);
create index on public.purchase_items(purchase_id);
grant select, insert, update on public.purchase_items to authenticated;
grant all on public.purchase_items to service_role;
alter table public.purchase_items enable row level security;
create policy "purchase_items own" on public.purchase_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ========================== PAIEMENTS ==========================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  number text not null,
  direction text not null check (direction in ('in','out')),
  customer_id uuid references public.customers(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  purchase_id uuid references public.purchases(id) on delete set null,
  amount numeric(14,2) not null,
  method text not null default 'especes',
  note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.payments(user_id, paid_at desc);
grant select, insert, update on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "payments own" on public.payments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================== DÉPENSES ===========================
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  number text not null,
  description text not null,
  category text not null default 'autres',
  amount numeric(14,2) not null,
  method text not null default 'especes',
  note text,
  expense_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.expenses(user_id, expense_date desc);
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create policy "expenses own" on public.expenses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================ CAISSE ============================
create table public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  number text not null,
  type text not null check (type in ('in','out')),
  amount numeric(14,2) not null,
  description text not null,
  category text,
  reference_type text,
  reference_id uuid,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.cash_transactions(user_id, occurred_at desc);
grant select, insert on public.cash_transactions to authenticated;
grant all on public.cash_transactions to service_role;
alter table public.cash_transactions enable row level security;
create policy "cash own" on public.cash_transactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.cash_closures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  closure_date date not null,
  opening numeric(14,2) not null default 0,
  inflow numeric(14,2) not null default 0,
  outflow numeric(14,2) not null default 0,
  closing numeric(14,2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, closure_date)
);
grant select, insert on public.cash_closures to authenticated;
grant all on public.cash_closures to service_role;
alter table public.cash_closures enable row level security;
create policy "closures own" on public.cash_closures for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================ STOCK ============================
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity_delta numeric(14,3) not null,
  type text not null,
  reference_type text,
  reference_id uuid,
  note text,
  occurred_at timestamptz not null default now()
);
create index on public.stock_movements(user_id, occurred_at desc);
grant select, insert on public.stock_movements to authenticated;
grant all on public.stock_movements to service_role;
alter table public.stock_movements enable row level security;
create policy "stock own" on public.stock_movements for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================== RETOURS ===========================
create table public.returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  number text not null,
  sale_id uuid not null references public.sales(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  total_refund numeric(14,2) not null default 0,
  cogs_returned numeric(14,2) not null default 0,
  restock boolean not null default true,
  reason text,
  returned_at timestamptz not null default now()
);
grant select, insert on public.returns to authenticated;
grant all on public.returns to service_role;
alter table public.returns enable row level security;
create policy "returns own" on public.returns for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  return_id uuid not null references public.returns(id) on delete cascade,
  sale_item_id uuid references public.sale_items(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  unit_cost numeric(14,2) not null default 0
);
grant select, insert on public.return_items to authenticated;
grant all on public.return_items to service_role;
alter table public.return_items enable row level security;
create policy "return_items own" on public.return_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ========================== HISTORIQUE ==========================
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  type text not null,
  description text not null,
  amount numeric(14,2),
  reference_type text,
  reference_id uuid,
  status text,
  created_at timestamptz not null default now()
);
create index on public.activity_log(user_id, created_at desc);
grant select, insert on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create policy "activity own" on public.activity_log for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
