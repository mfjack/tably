create function public.return_order_stock(p_organization_id uuid, p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ingredients as i
     set current_stock = i.current_stock - movement.net_quantity
    from (
      select ingredient_id, sum(quantity) as net_quantity
        from public.stock_movements
       where order_id = p_order_id
       group by ingredient_id
      having sum(quantity) <> 0
    ) as movement
   where i.id = movement.ingredient_id
     and i.organization_id = p_organization_id;

  insert into public.stock_movements (organization_id, ingredient_id, order_id, quantity)
  select p_organization_id, ingredient_id, p_order_id, -sum(quantity)
    from public.stock_movements
   where order_id = p_order_id
   group by ingredient_id
  having sum(quantity) <> 0;

  update public.products as p
     set stock_quantity = p.stock_quantity - movement.net_quantity
    from (
      select product_id, sum(quantity) as net_quantity
        from public.product_stock_movements
       where order_id = p_order_id
       group by product_id
      having sum(quantity) <> 0
    ) as movement
   where p.id = movement.product_id
     and p.organization_id = p_organization_id
     and p.stock_quantity is not null;

  insert into public.product_stock_movements (organization_id, product_id, order_id, quantity)
  select p_organization_id, product_id, p_order_id, -sum(quantity)
    from public.product_stock_movements
   where order_id = p_order_id
   group by product_id
  having sum(quantity) <> 0;
end;
$$;

revoke execute on function public.return_order_stock from public, anon, authenticated;

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  v_order := public.lock_open_order(p_order_id);
  perform public.return_order_stock(v_order.organization_id, p_order_id);
  update public.orders set status = 'canceled' where id = p_order_id;
end;
$$;

create function public.cancel_paid_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if not found or not public.has_any_module_access(
    v_order.organization_id, array['order_tabs']::public.app_module[]
  ) then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.paid_at is null or v_order.status = 'canceled' then
    raise exception 'order cannot be canceled' using errcode = 'TB046';
  end if;

  if exists (
    select 1
      from public.order_payments as payment
      join public.cash_sessions as session on session.id = payment.cash_session_id
     where payment.order_id = p_order_id
       and session.closed_at is not null
  ) then
    raise exception 'cash session is closed' using errcode = 'TB043';
  end if;

  perform public.return_order_stock(v_order.organization_id, p_order_id);

  delete from public.account_entries
   where order_id = p_order_id
     and kind = 'charge';

  delete from public.loyalty_transactions
   where order_id = p_order_id;

  delete from public.order_payments
   where order_id = p_order_id;

  update public.orders
     set status = 'canceled'
   where id = p_order_id;
end;
$$;

revoke execute on function public.cancel_paid_order from public, anon;
grant execute on function public.cancel_paid_order to authenticated;
