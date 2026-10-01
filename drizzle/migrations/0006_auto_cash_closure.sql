ALTER TABLE public.cash_closures ADD COLUMN IF NOT EXISTS auto boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public._compute_closure(_uid uuid, p_date date, p_note text, p_counted numeric, p_auto boolean, p_overwrite boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  _opening numeric; _in numeric; _out numeric; _id uuid;
  _sales numeric; _pay_in numeric; _pay_out numeric; _exp numeric;
  _closing numeric; _variance numeric;
begin
  if not p_overwrite and exists (select 1 from cash_closures where user_id=_uid and closure_date=p_date) then
    return jsonb_build_object('skipped', true);
  end if;
  select coalesce(sum(case when type='in' then amount else -amount end),0) into _opening
    from cash_transactions where user_id = _uid and occurred_at::date < p_date;
  _opening := _opening + coalesce((select opening_cash from profiles where id = _uid), 0);
  select coalesce(sum(amount) filter (where type='in'),0), coalesce(sum(amount) filter (where type='out'),0)
    into _in, _out from cash_transactions where user_id = _uid and occurred_at::date = p_date;
  select coalesce(sum(total - refunded),0) into _sales
    from sales where user_id = _uid and sale_date::date = p_date and status <> 'cancelled';
  select coalesce(sum(amount) filter (where direction='in'),0), coalesce(sum(amount) filter (where direction='out'),0)
    into _pay_in, _pay_out from payments where user_id = _uid and paid_at::date = p_date;
  select coalesce(sum(amount),0) into _exp from expenses where user_id = _uid and expense_date::date = p_date;
  _closing := _opening + _in - _out;
  _variance := case when p_counted is null then 0 else round(p_counted - _closing, 2) end;
  insert into cash_closures(user_id, closure_date, opening, inflow, outflow, closing, note,
    sales_total, payments_in, payments_out, expenses_total, counted, variance, closed_at, auto)
  values (_uid, p_date, _opening, _in, _out, _closing, p_note,
    _sales, _pay_in, _pay_out, _exp, p_counted, _variance, now(), p_auto)
  on conflict (user_id, closure_date) do update
    set opening = excluded.opening, inflow = excluded.inflow, outflow = excluded.outflow,
        closing = excluded.closing, note = excluded.note,
        sales_total = excluded.sales_total, payments_in = excluded.payments_in,
        payments_out = excluded.payments_out, expenses_total = excluded.expenses_total,
        counted = excluded.counted, variance = excluded.variance, closed_at = now(), auto = excluded.auto
  returning id into _id;
  if p_auto then
    insert into activity_log(user_id, type, description, amount, reference_type, reference_id, status)
    values (_uid, 'cash_closure', 'Clôture automatique du ' || to_char(p_date,'DD/MM/YYYY'), _closing, 'cash_closure', _id,
      case when _closing < 0 then 'warning' else 'completed' end);
  end if;
  return jsonb_build_object('id', _id, 'opening', _opening, 'inflow', _in, 'outflow', _out,
    'closing', _closing, 'sales_total', _sales, 'expenses_total', _exp, 'variance', _variance);
end $$;
REVOKE ALL ON FUNCTION public._compute_closure(uuid, date, text, numeric, boolean, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.close_cash(p_date date, p_note text default null, p_counted numeric default null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  return public._compute_closure(auth.uid(), p_date, p_note, p_counted, false, true);
end $$;
GRANT EXECUTE ON FUNCTION public.close_cash(date, text, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.auto_close_all_cash()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _d date := (now() at time zone 'America/Port-au-Prince')::date - 1; _u uuid; _n int := 0;
begin
  for _u in select id from profiles loop
    perform public._compute_closure(_u, _d, 'Clôture automatique à minuit', null, true, false);
    _n := _n + 1;
  end loop;
  return _n;
end $$;
REVOKE ALL ON FUNCTION public.auto_close_all_cash() FROM PUBLIC, anon, authenticated;