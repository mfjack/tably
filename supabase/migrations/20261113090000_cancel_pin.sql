alter table public.organizations
  add column is_cancel_pin_enabled boolean not null default false;

alter table public.orders
  add column canceled_at timestamptz,
  add column canceled_by uuid references auth.users (id) on delete set null;

create table public.organization_cancel_pins (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz
);

alter table public.organization_cancel_pins enable row level security;
revoke all on public.organization_cancel_pins from anon, authenticated;

create function public.set_cancel_pin(p_organization_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if nullif(trim(p_pin), '') is null then
    delete from public.organization_cancel_pins
     where organization_id = p_organization_id;
    update public.organizations
       set is_cancel_pin_enabled = false
     where id = p_organization_id;
    return;
  end if;

  if p_pin !~ '^\d{4}$' then
    raise exception 'invalid pin' using errcode = '22023';
  end if;

  insert into public.organization_cancel_pins (organization_id, pin_hash)
  values (p_organization_id, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (organization_id) do update
    set pin_hash = excluded.pin_hash,
        failed_attempts = 0,
        locked_until = null;

  update public.organizations
     set is_cancel_pin_enabled = true
   where id = p_organization_id;
end;
$$;

revoke all on function public.set_cancel_pin(uuid, text) from public, anon;
grant execute on function public.set_cancel_pin(uuid, text) to authenticated;

create function public.check_cancel_authorization(p_organization_id uuid, p_pin text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pin public.organization_cancel_pins;
  v_attempts integer;
begin
  if public.has_role(p_organization_id, array['owner']::public.member_role[]) then
    return 'authorized';
  end if;

  select * into v_pin
    from public.organization_cancel_pins
   where organization_id = p_organization_id
     for update;

  if not found then
    return 'authorized';
  end if;

  if v_pin.locked_until is not null and v_pin.locked_until > now() then
    return 'locked';
  end if;

  if nullif(trim(p_pin), '') is null then
    return 'pin_required';
  end if;

  if v_pin.pin_hash = extensions.crypt(p_pin, v_pin.pin_hash) then
    update public.organization_cancel_pins
       set failed_attempts = 0,
           locked_until = null
     where organization_id = p_organization_id;
    return 'authorized';
  end if;

  v_attempts := v_pin.failed_attempts + 1;

  update public.organization_cancel_pins
     set failed_attempts = case when v_attempts >= 5 then 0 else v_attempts end,
         locked_until = case when v_attempts >= 5 then now() + interval '5 minutes' end
   where organization_id = p_organization_id;

  return case when v_attempts >= 5 then 'locked' else 'invalid_pin' end;
end;
$$;

revoke all on function public.check_cancel_authorization(uuid, text) from public, anon, authenticated;

drop function public.cancel_paid_order(uuid);

create function public.cancel_paid_order(p_order_id uuid, p_pin text default '')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_authorization text;
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

  v_authorization := public.check_cancel_authorization(v_order.organization_id, p_pin);
  if v_authorization <> 'authorized' then
    return v_authorization;
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
     set status = 'canceled',
         canceled_at = now(),
         canceled_by = auth.uid()
   where id = p_order_id;

  return 'authorized';
end;
$$;

revoke all on function public.cancel_paid_order(uuid, text) from public, anon;
grant execute on function public.cancel_paid_order(uuid, text) to authenticated;

drop function public.reopen_order(uuid);

create function public.reopen_order(p_order_id uuid, p_pin text default '')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_authorization text;
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

  v_authorization := public.check_cancel_authorization(v_order.organization_id, p_pin);
  if v_authorization <> 'authorized' then
    return v_authorization;
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

  return 'authorized';
end;
$$;

revoke all on function public.reopen_order(uuid, text) from public, anon;
grant execute on function public.reopen_order(uuid, text) to authenticated;
