-- Logique métier centralisée (transactions atomiques)

create or replace function public.create_sale(
  p_items jsonb,
  p_customer_id uuid default null,
  p_discount numeric default 0,
  p_paid numeric default 0,
  p_method text default 'especes',
  p_note text default null,
  p_sale_date timestamptz default now(),
  p_allow_negative_stock boolean default false
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _sale_id uuid;
  _number text;
  _item jsonb;
  _product public.products%rowtype;
  _qty numeric; _price numeric; _cost numeric; _name text;
  _subtotal numeric := 0; _cogs numeric := 0; _total numeric; _paid numeric;
begin
  if _uid is null then raise exception 'Non authentifié'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Aucun produit dans la vente'; end if;

  _number := public.next_doc_number('VTE');
  insert into public.sales(user_id, number, customer_id, discount, payment_method, note, sale_date)
  values (_uid, _number, p_customer_id, coalesce(p_discount,0), p_method, p_note, coalesce(p_sale_date, now()))
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

  _total := round(_subtotal - coalesce(p_discount,0), 2);
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

  return jsonb_build_object('id', _sale_id, 'number', _number, 'total', _total, 'paid', _paid, 'due', _total - _paid);
end;
$$;
grant execute on function public.create_sale(jsonb, uuid, numeric, numeric, text, text, timestamptz, boolean) to authenticated;

create or replace function public.create_purchase(
  p_items jsonb,
  p_supplier_id uuid default null,
  p_paid numeric default 0,
  p_method text default 'especes',
  p_note text default null,
  p_purchase_date timestamptz default now()
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _id uuid; _number text; _item jsonb;
  _product public.products%rowtype;
  _qty numeric; _cost numeric; _total numeric := 0; _paid numeric;
begin
  if _uid is null then raise exception 'Non authentifié'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Aucun produit dans l''achat'; end if;

  _number := public.next_doc_number('ACH');
  insert into public.purchases(user_id, number, supplier_id, payment_method, note, purchase_date)
  values (_uid, _number, p_supplier_id, p_method, p_note, coalesce(p_purchase_date, now()))
  returning id into _id;

  for _item in select * from jsonb_array_elements(p_items) loop
    _qty := (_item->>'quantity')::numeric;
    if _qty is null or _qty <= 0 then raise exception 'Quantité invalide'; end if;
    select * into _product from public.products where id = (_item->>'product_id')::uuid and user_id = _uid;
    if not found then raise exception 'Produit introuvable'; end if;
    _cost := coalesce((_item->>'unit_cost')::numeric, _product.cost_price);

    insert into public.purchase_items(user_id, purchase_id, product_id, product_name, quantity, unit_cost, line_total)
    values (_uid, _id, _product.id, _product.name, _qty, _cost, round(_qty * _cost, 2));

    if _product.track_stock then
      update public.products set stock = stock + _qty, cost_price = _cost where id = _product.id;
      insert into public.stock_movements(user_id, product_id, quantity_delta, type, reference_type, reference_id, note)
      values (_uid, _product.id, _qty, 'achat', 'purchase', _id, _number);
    else
      update public.products set cost_price = _cost where id = _product.id;
    end if;

    _total := _total + round(_qty * _cost, 2);
  end loop;

  _paid := round(coalesce(p_paid,0), 2);
  if _paid > _total then raise exception 'Le montant payé dépasse le total'; end if;
  update public.purchases set total = _total, paid = _paid where id = _id;

  if _paid > 0 then
    insert into public.payments(user_id, number, direction, supplier_id, purchase_id, amount, method, note, paid_at)
    values (_uid, public.next_doc_number('PAY'), 'out', p_supplier_id, _id, _paid, p_method, 'Paiement achat ' || _number, coalesce(p_purchase_date, now()));
    insert into public.cash_transactions(user_id, number, type, amount, description, category, reference_type, reference_id, occurred_at)
    values (_uid, public.next_doc_number('CSH'), 'out', _paid, 'Achat ' || _number, 'achat', 'purchase', _id, coalesce(p_purchase_date, now()));
  end if;

  insert into public.activity_log(user_id, type, description, amount, reference_type, reference_id, status)
  values (_uid, 'achat', 'Achat ' || _number, _total, 'purchase', _id, 'completed');

  return jsonb_build_object('id', _id, 'number', _number, 'total', _total, 'paid', _paid);
end;
$$;
grant execute on function public.create_purchase(jsonb, uuid, numeric, text, text, timestamptz) to authenticated;

create or replace function public.record_payment(
  p_direction text,
  p_amount numeric,
  p_method text default 'especes',
  p_customer_id uuid default null,
  p_supplier_id uuid default null,
  p_sale_id uuid default null,
  p_purchase_id uuid default null,
  p_note text default null,
  p_paid_at timestamptz default now(),
  p_allow_overpay boolean default false
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _pay_id uuid; _number text; _remaining numeric; _amount numeric := round(coalesce(p_amount,0),2);
  _sale public.sales%rowtype; _purchase public.purchases%rowtype;
begin
  if _uid is null then raise exception 'Non authentifié'; end if;
  if _amount <= 0 then raise exception 'Le montant doit être supérieur à zéro'; end if;
  if p_direction not in ('in','out') then raise exception 'Direction invalide'; end if;

  if p_sale_id is not null then
    select * into _sale from public.sales where id = p_sale_id and user_id = _uid;
    if not found then raise exception 'Vente introuvable'; end if;
    _remaining := _sale.total - _sale.paid - _sale.refunded;
    if _amount > _remaining and not p_allow_overpay then
      raise exception 'Le paiement dépasse le reste à payer (%)', _remaining;
    end if;
    update public.sales set paid = paid + _amount where id = p_sale_id;
  end if;

  if p_purchase_id is not null then
    select * into _purchase from public.purchases where id = p_purchase_id and user_id = _uid;
    if not found then raise exception 'Achat introuvable'; end if;
    _remaining := _purchase.total - _purchase.paid;
    if _amount > _remaining and not p_allow_overpay then
      raise exception 'Le paiement dépasse le reste à payer (%)', _remaining;
    end if;
    update public.purchases set paid = paid + _amount where id = p_purchase_id;
  end if;

  _number := public.next_doc_number('PAY');
  insert into public.payments(user_id, number, direction, customer_id, supplier_id, sale_id, purchase_id, amount, method, note, paid_at)
  values (_uid, _number, p_direction, p_customer_id, p_supplier_id, p_sale_id, p_purchase_id, _amount, p_method, p_note, coalesce(p_paid_at, now()))
  returning id into _pay_id;

  insert into public.cash_transactions(user_id, number, type, amount, description, category, reference_type, reference_id, occurred_at)
  values (_uid, public.next_doc_number('CSH'), case when p_direction = 'in' then 'in' else 'out' end, _amount,
    coalesce(p_note, 'Paiement ' || _number), 'paiement', 'payment', _pay_id, coalesce(p_paid_at, now()));

  insert into public.activity_log(user_id, type, description, amount, reference_type, reference_id, status)
  values (_uid, 'paiement', 'Paiement ' || _number, _amount, 'payment', _pay_id, p_direction);

  return jsonb_build_object('id', _pay_id, 'number', _number, 'amount', _amount);
end;
$$;
grant execute on function public.record_payment(text, numeric, text, uuid, uuid, uuid, uuid, text, timestamptz, boolean) to authenticated;

create or replace function public.create_expense(
  p_description text,
  p_amount numeric,
  p_category text default 'autres',
  p_method text default 'especes',
  p_note text default null,
  p_expense_date timestamptz default now(),
  p_paid boolean default true
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  _uid uuid := auth.uid(); _id uuid; _number text; _amount numeric := round(coalesce(p_amount,0),2);
begin
  if _uid is null then raise exception 'Non authentifié'; end if;
  if _amount <= 0 then raise exception 'Le montant doit être supérieur à zéro'; end if;
  _number := public.next_doc_number('DEP');
  insert into public.expenses(user_id, number, description, category, amount, method, note, expense_date)
  values (_uid, _number, p_description, coalesce(p_category,'autres'), _amount, p_method, p_note, coalesce(p_expense_date, now()))
  returning id into _id;

  if p_paid then
    insert into public.cash_transactions(user_id, number, type, amount, description, category, reference_type, reference_id, occurred_at)
    values (_uid, public.next_doc_number('CSH'), 'out', _amount, p_description, 'depense', 'expense', _id, coalesce(p_expense_date, now()));
  end if;

  insert into public.activity_log(user_id, type, description, amount, reference_type, reference_id, status)
  values (_uid, 'depense', p_description, _amount, 'expense', _id, 'completed');

  return jsonb_build_object('id', _id, 'number', _number, 'amount', _amount);
end;
$$;
grant execute on function public.create_expense(text, numeric, text, text, text, timestamptz, boolean) to authenticated;

create or replace function public.create_sale_return(
  p_sale_id uuid,
  p_items jsonb,
  p_refund numeric default 0,
  p_restock boolean default true,
  p_reason text default null
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _sale public.sales%rowtype;
  _return_id uuid; _number text; _item jsonb;
  _si public.sale_items%rowtype;
  _qty numeric; _refund_total numeric := 0; _cogs_ret numeric := 0;
  _all_returned boolean;
begin
  if _uid is null then raise exception 'Non authentifié'; end if;
  select * into _sale from public.sales where id = p_sale_id and user_id = _uid;
  if not found then raise exception 'Vente introuvable'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Aucun article à retourner'; end if;

  _number := public.next_doc_number('RET');
  insert into public.returns(user_id, number, sale_id, customer_id, restock, reason)
  values (_uid, _number, p_sale_id, _sale.customer_id, p_restock, p_reason)
  returning id into _return_id;

  for _item in select * from jsonb_array_elements(p_items) loop
    _qty := (_item->>'quantity')::numeric;
    if _qty is null or _qty <= 0 then continue; end if;
    select * into _si from public.sale_items where id = (_item->>'sale_item_id')::uuid and user_id = _uid and sale_id = p_sale_id;
    if not found then raise exception 'Ligne de vente introuvable'; end if;
    if _qty > (_si.quantity - _si.returned_quantity) then
      raise exception 'Quantité retournée supérieure à la quantité vendue pour %', _si.product_name;
    end if;

    insert into public.return_items(user_id, return_id, sale_item_id, product_id, product_name, quantity, unit_price, unit_cost)
    values (_uid, _return_id, _si.id, _si.product_id, _si.product_name, _qty, _si.unit_price, _si.unit_cost);

    update public.sale_items set returned_quantity = returned_quantity + _qty where id = _si.id;

    if p_restock and _si.product_id is not null then
      update public.products set stock = stock + _qty where id = _si.product_id and track_stock;
      insert into public.stock_movements(user_id, product_id, quantity_delta, type, reference_type, reference_id, note)
      values (_uid, _si.product_id, _qty, 'retour', 'return', _return_id, _number);
    end if;

    _refund_total := _refund_total + round(_qty * _si.unit_price, 2);
    _cogs_ret := _cogs_ret + round(_qty * _si.unit_cost, 2);
  end loop;

  update public.returns set total_refund = _refund_total, cogs_returned = _cogs_ret where id = _return_id;
  update public.sales set refunded = refunded + _refund_total where id = p_sale_id;

  select bool_and(returned_quantity >= quantity) into _all_returned from public.sale_items where sale_id = p_sale_id;
  update public.sales set status = case when _all_returned then 'returned' else 'partially_returned' end where id = p_sale_id;

  if coalesce(p_refund,0) > 0 then
    insert into public.payments(user_id, number, direction, customer_id, sale_id, amount, method, note, paid_at)
    values (_uid, public.next_doc_number('PAY'), 'out', _sale.customer_id, p_sale_id, round(p_refund,2), 'especes', 'Remboursement ' || _number, now());
    insert into public.cash_transactions(user_id, number, type, amount, description, category, reference_type, reference_id)
    values (_uid, public.next_doc_number('CSH'), 'out', round(p_refund,2), 'Remboursement ' || _number, 'retour', 'return', _return_id);
  end if;

  insert into public.activity_log(user_id, type, description, amount, reference_type, reference_id, status)
  values (_uid, 'retour', 'Retour ' || _number || ' (vente ' || _sale.number || ')', _refund_total, 'return', _return_id, 'returned');

  return jsonb_build_object('id', _return_id, 'number', _number, 'refund', _refund_total);
end;
$$;
grant execute on function public.create_sale_return(uuid, jsonb, numeric, boolean, text) to authenticated;

create or replace function public.close_cash(p_date date, p_note text default null)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _opening numeric; _in numeric; _out numeric; _id uuid;
begin
  if _uid is null then raise exception 'Non authentifié'; end if;
  select coalesce(sum(case when type='in' then amount else -amount end),0) into _opening
    from public.cash_transactions where user_id = _uid and occurred_at::date < p_date;
  _opening := _opening + coalesce((select opening_cash from public.profiles where id = _uid), 0);
  select coalesce(sum(amount) filter (where type='in'),0), coalesce(sum(amount) filter (where type='out'),0)
    into _in, _out from public.cash_transactions where user_id = _uid and occurred_at::date = p_date;

  insert into public.cash_closures(user_id, closure_date, opening, inflow, outflow, closing, note)
  values (_uid, p_date, _opening, _in, _out, _opening + _in - _out, p_note)
  on conflict (user_id, closure_date) do update
    set opening = excluded.opening, inflow = excluded.inflow, outflow = excluded.outflow,
        closing = excluded.closing, note = excluded.note
  returning id into _id;

  return jsonb_build_object('id', _id, 'opening', _opening, 'inflow', _in, 'outflow', _out, 'closing', _opening + _in - _out);
end;
$$;
grant execute on function public.close_cash(date, text) to authenticated;