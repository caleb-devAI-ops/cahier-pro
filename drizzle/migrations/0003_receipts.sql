alter table public.profiles add column if not exists business_address text;
alter table public.profiles add column if not exists business_whatsapp text;

alter table public.sales add column if not exists fee numeric not null default 0;
alter table public.sales add column if not exists receipt_number text;

do $$
declare r record;
begin
  for r in
    select s.id,
           extract(year from s.sale_date)::int as yr,
           row_number() over (partition by s.user_id, extract(year from s.sale_date)
                              order by s.sale_date, s.created_at) as rn
    from public.sales s
    where s.receipt_number is null
  loop
    update public.sales
       set receipt_number = 'RECU-' || r.yr || '-' || lpad(r.rn::text, 6, '0')
     where id = r.id;
  end loop;

  insert into public.doc_counters(user_id, prefix, year, seq)
  select user_id, 'RECU', extract(year from sale_date)::int, count(*)
    from public.sales
   group by user_id, extract(year from sale_date)
  on conflict (user_id, prefix, year)
  do update set seq = greatest(public.doc_counters.seq, excluded.seq);
end $$;

create unique index if not exists sales_receipt_number_uidx
  on public.sales(user_id, receipt_number);

drop function if exists public.create_sale(jsonb, uuid, numeric, numeric, text, text, timestamptz, boolean);

create or replace function public.create_sale(
  p_items jsonb,
  p_customer_id uuid default null,
  p_discount numeric default 0,
  p_paid numeric default 0,
  p_method text default 'especes',
  p_note text default null,
  p_sale_date timestamptz default now(),
  p_allow_negative_stock boolean default false,
  p_fee numeric default 0
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _sale_id uuid;
  _number text;
  _receipt text;
  _item jsonb;
  _product public.products%rowtype;
  _qty numeric; _price numeric; _cost numeric; _name text;
  _subtotal numeric := 0; _cogs numeric := 0; _total numeric; _paid numeric;
  _fee numeric := round(coalesce(p_fee, 0), 2);
begin
  if _uid is null then raise exception 'Non authentifié'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Aucun produit dans la vente'; end if;
  if _fee < 0 then raise exception 'Les frais ne peuvent pas être négatifs'; end if;

  _number := public.next_doc_number('VTE');
  _receipt := public.next_doc_number('RECU');
  insert into public.sales(user_id, number, receipt_number, customer_id, discount, fee, payment_method, note, sale_date)
  values (_uid, _number, _receipt, p_customer_id, coalesce(p_discount,0), _fee, p_method, p_note, coalesce(p_sale_date, now()))
  returning id into _sale_id;

  for _item in select * from jsonb_array_elements(p_items) loop
    _qty := (_item->>'quantity')::numeric;
    if _qty is null or _qty <= 0 then raise exception 'Quantité invalide'; end if;
    select * into _product from public.products where id = (_item->>'product_id')::uuid and user_id = _uid;
    if not found then raise exception 'Produit introuvable'; end if;
    _price := coalesce((_item->>'unit_price')::numeric, _product.sale_price);
    _cost := coalesce((_item->>'unit_cost')::numeric, _product.cost_price);
    _name := _product.name;

    if _product.track_stock and not p_allow_negative_stock and _product.stock < _qty then
      raise exception 'Stock insuffisant pour %: % disponible(s)', _product.name, _product.stock;
    end if;

    insert into public.sale_items(user_id, sale_id, product_id, product_name, quantity, unit_price, unit_cost, line_total)
    values (_uid, _sale_id, _product.id, _name, _qty, _price, _cost, round(_qty * _price, 2));

    if _product.track_stock then
      update public.products set stock = stock - _qty where id = _product.id;
      insert into public.stock_movements(user_id, product_id, quantity_delta, type, reference_type, reference_id, note)
      values (_uid, _product.id, -_qty, 'vente', 'sale', _sale_id, _number);
    end if;

    _subtotal := _subtotal + round(_qty * _price, 2);
    _cogs := _cogs + round(_qty * _cost, 2);
  end loop;

  _total := round(_subtotal - coalesce(p_discount,0) + _fee, 2);
  if _total < 0 then raise exception 'La remise dépasse le sous-total'; end if;
  _paid := round(coalesce(p_paid,0), 2);
  if _paid > _total then raise exception 'Le montant payé dépasse le total'; end if;

  update public.sales set subtotal = _subtotal, total = _total, cogs = _cogs, paid = _paid where id = _sale_id;

  if _paid > 0 then
    insert into public.payments(user_id, number, direction, customer_id, sale_id, amount, method, note, paid_at)
    values (_uid, public.next_doc_number('PAY'), 'in', p_customer_id, _sale_id, _paid, p_method, 'Paiement vente ' || _number, coalesce(p_sale_date, now()));
    insert into public.cash_transactions(user_id, number, type, amount, description, category, reference_type, reference_id, occurred_at)
    values (_uid, public.next_doc_number('CSH'), 'in', _paid, 'Vente ' || _number, 'vente', 'sale', _sale_id, coalesce(p_sale_date, now()));
  end if;

  insert into public.activity_log(user_id, type, description, amount, reference_type, reference_id, status)
  values (_uid, 'vente', 'Vente ' || _number, _total, 'sale', _sale_id, 'completed');

  return jsonb_build_object('id', _sale_id, 'number', _number, 'receipt_number', _receipt, 'total', _total, 'paid', _paid, 'due', _total - _paid);
end;
$$;
grant execute on function public.create_sale(jsonb, uuid, numeric, numeric, text, text, timestamptz, boolean, numeric) to authenticated;