create function public.reopen_order(p_order_id uuid)
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

  if v_order.paid_at is null or v_order.status = 'canceled' or v_order.customer_name is null then
    raise exception 'order cannot be reopened' using errcode = 'TB042';
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

  perform pg_advisory_xact_lock(
    hashtext(v_order.organization_id::text || ':' || lower(v_order.customer_name))
  );

  if exists (
    select 1
      from public.orders as o
     where o.organization_id = v_order.organization_id
       and o.id <> p_order_id
       and o.paid_at is null
       and o.status <> 'canceled'
       and lower(o.customer_name) = lower(v_order.customer_name)
  ) then
    raise exception 'customer name already in use' using errcode = 'TB002';
  end if;

  delete from public.account_entries
   where order_id = p_order_id
     and kind = 'charge';

  delete from public.loyalty_transactions
   where order_id = p_order_id;

  delete from public.order_payments
   where order_id = p_order_id;

  update public.orders
     set paid_at = null,
         paid_by = null,
         paid_by_operator_name = null,
         payment_method = null,
         amount_received = null,
         customer_account_id = null,
         service_fee_percent = null,
         service_fee_amount = 0,
         discount_type = null,
         discount_value = null,
         discount_amount = 0,
         discounted_by = null,
         loyalty_reward_amount = 0,
         loyalty_reward_product_name = null,
         total = subtotal + takeaway_fee,
         status = case when status = 'completed' then 'ready' else status end
   where id = p_order_id;
end;
$$;

revoke execute on function public.reopen_order from public, anon;
grant execute on function public.reopen_order to authenticated;
