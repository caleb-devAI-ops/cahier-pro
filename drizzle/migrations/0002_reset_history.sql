create or replace function public.reset_history(p_reset_stock boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Non authentifié';
  end if;

  delete from public.return_items where user_id = v_user;
  delete from public.returns where user_id = v_user;
  delete from public.sale_items where user_id = v_user;
  delete from public.payments where user_id = v_user;
  delete from public.sales where user_id = v_user;
  delete from public.purchase_items where user_id = v_user;
  delete from public.purchases where user_id = v_user;
  delete from public.expenses where user_id = v_user;
  delete from public.cash_transactions where user_id = v_user;
  delete from public.cash_closures where user_id = v_user;
  delete from public.stock_movements where user_id = v_user;
  delete from public.activity_log where user_id = v_user;
  delete from public.doc_counters where user_id = v_user;

  if p_reset_stock then
    update public.products set stock = 0 where user_id = v_user;
  end if;
end;
$$;

grant execute on function public.reset_history(boolean) to authenticated;