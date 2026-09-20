-- 1) Détails de clôture quotidienne
alter table public.cash_closures
  add column if not exists sales_total numeric(14,2) not null default 0,
  add column if not exists payments_in numeric(14,2) not null default 0,
  add column if not exists payments_out numeric(14,2) not null default 0,
  add column if not exists expenses_total numeric(14,2) not null default 0,
  add column if not exists counted numeric(14,2),
  add column if not exists variance numeric(14,2) not null default 0,
  add column if not exists closed_at timestamptz not null default now();

grant update on public.cash_closures to authenticated;

drop function if exists public.close_cash(date, text);

create or replace function public.close_cash(p_date date, p_note text default null, p_counted numeric default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _opening numeric; _in numeric; _out numeric; _id uuid;
  _sales numeric; _pay_in numeric; _pay_out numeric; _exp numeric;
  _closing numeric; _variance numeric;
begin
  if _uid is null then raise exception 'Non authentifié'; end if;

  select coalesce(sum(case when type='in' then amount else -amount end),0) into _opening
    from public.cash_transactions where user_id = _uid and occurred_at::date < p_date;
  _opening := _opening + coalesce((select opening_cash from public.profiles where id = _uid), 0);

  select coalesce(sum(amount) filter (where type='in'),0), coalesce(sum(amount) filter (where type='out'),0)
    into _in, _out from public.cash_transactions where user_id = _uid and occurred_at::date = p_date;

  select coalesce(sum(total - refunded),0) into _sales
    from public.sales where user_id = _uid and sale_date::date = p_date and status <> 'cancelled';

  select coalesce(sum(amount) filter (where direction='in'),0), coalesce(sum(amount) filter (where direction='out'),0)
    into _pay_in, _pay_out
    from public.payments where user_id = _uid and paid_at::date = p_date;

  select coalesce(sum(amount),0) into _exp
    from public.expenses where user_id = _uid and expense_date::date = p_date;

  _closing := _opening + _in - _out;
  _variance := case when p_counted is null then 0 else round(p_counted - _closing, 2) end;

  insert into public.cash_closures(user_id, closure_date, opening, inflow, outflow, closing, note,
    sales_total, payments_in, payments_out, expenses_total, counted, variance, closed_at)
  values (_uid, p_date, _opening, _in, _out, _closing, p_note,
    _sales, _pay_in, _pay_out, _exp, p_counted, _variance, now())
  on conflict (user_id, closure_date) do update
    set opening = excluded.opening, inflow = excluded.inflow, outflow = excluded.outflow,
        closing = excluded.closing, note = excluded.note,
        sales_total = excluded.sales_total, payments_in = excluded.payments_in,
        payments_out = excluded.payments_out, expenses_total = excluded.expenses_total,
        counted = excluded.counted, variance = excluded.variance, closed_at = now()
  returning id into _id;

  return jsonb_build_object('id', _id, 'opening', _opening, 'inflow', _in, 'outflow', _out,
    'closing', _closing, 'sales_total', _sales, 'expenses_total', _exp, 'variance', _variance);
end;
$$;

grant execute on function public.close_cash(date, text, numeric) to authenticated;

-- 2) Restauration complète d'une sauvegarde
create or replace function public.restore_backup(p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _tables text[] := array[
    'customers','suppliers','products','sales','sale_items','purchases','purchase_items',
    'payments','expenses','cash_transactions','cash_closures','stock_movements',
    'returns','return_items','activity_log','doc_counters'
  ];
  _t text;
  _rows jsonb;
  _count int;
  _result jsonb := '{}'::jsonb;
begin
  if _uid is null then raise exception 'Non authentifié'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Sauvegarde invalide';
  end if;

  -- suppression dans l'ordre inverse des dépendances
  delete from public.return_items where user_id = _uid;
  delete from public.returns where user_id = _uid;
  delete from public.sale_items where user_id = _uid;
  delete from public.payments where user_id = _uid;
  delete from public.sales where user_id = _uid;
  delete from public.purchase_items where user_id = _uid;
  delete from public.purchases where user_id = _uid;
  delete from public.expenses where user_id = _uid;
  delete from public.cash_transactions where user_id = _uid;
  delete from public.cash_closures where user_id = _uid;
  delete from public.stock_movements where user_id = _uid;
  delete from public.activity_log where user_id = _uid;
  delete from public.doc_counters where user_id = _uid;
  delete from public.products where user_id = _uid;
  delete from public.customers where user_id = _uid;
  delete from public.suppliers where user_id = _uid;

  foreach _t in array _tables loop
    _rows := coalesce(p_data -> _t, '[]'::jsonb);
    if jsonb_typeof(_rows) <> 'array' or jsonb_array_length(_rows) = 0 then
      continue;
    end if;
    execute format(
      'insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1)',
      _t, _t
    ) using (
      select jsonb_agg(e || jsonb_build_object('user_id', _uid)) from jsonb_array_elements(_rows) e
    );
    get diagnostics _count = row_count;
    _result := _result || jsonb_build_object(_t, _count);
  end loop;

  return _result;
end;
$$;

grant execute on function public.restore_backup(jsonb) to authenticated;