drop function public.record_loyalty_purchase(uuid, text, text, boolean, text);
drop function public.adjust_loyalty_stamps(uuid, integer, text, text);

alter table public.loyalty_settings drop column reward_value;

create function public.record_loyalty_purchase(
  p_order_id uuid,
  p_phone text,
  p_name text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_settings public.loyalty_settings;
  v_customer_id uuid;
  v_name text := nullif(trim(coalesce(p_name, '')), '');
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found or not public.is_member(v_order.organization_id) then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.paid_at is null then
    raise exception 'order is not paid' using errcode = '22023';
  end if;

  select * into v_settings
    from public.loyalty_settings
   where organization_id = v_order.organization_id;

  if not found or not v_settings.is_enabled then
    raise exception 'loyalty is disabled' using errcode = 'TB020';
  end if;

  if p_phone !~ '^[0-9]{10,11}$' then
    raise exception 'invalid phone' using errcode = '22023';
  end if;

  select id into v_customer_id
    from public.loyalty_customers
   where organization_id = v_order.organization_id
     and phone = p_phone;

  if v_customer_id is null then
    if v_name is null then
      raise exception 'customer name is required' using errcode = 'TB021';
    end if;

    insert into public.loyalty_customers (organization_id, name, phone)
    values (v_order.organization_id, v_name, p_phone)
    on conflict (organization_id, phone) do nothing
    returning id into v_customer_id;

    if v_customer_id is null then
      select id into v_customer_id
        from public.loyalty_customers
       where organization_id = v_order.organization_id
         and phone = p_phone;
    end if;
  end if;

  if v_order.total >= v_settings.minimum_purchase then
    insert into public.loyalty_transactions (organization_id, customer_id, order_id, kind, stamps)
    values (v_order.organization_id, v_customer_id, p_order_id, 'earn', 1)
    on conflict (order_id, kind) where order_id is not null do nothing;
  end if;

  return public.get_loyalty_balance(v_customer_id);
end;
$$;

revoke execute on function public.record_loyalty_purchase from public, anon;
grant execute on function public.record_loyalty_purchase to authenticated;

create function public.redeem_loyalty_reward(p_customer_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_settings public.loyalty_settings;
begin
  select organization_id into v_organization_id
    from public.loyalty_customers
   where id = p_customer_id;

  if v_organization_id is null or not public.is_member(v_organization_id) then
    raise exception 'customer not found' using errcode = 'P0002';
  end if;

  select * into v_settings
    from public.loyalty_settings
   where organization_id = v_organization_id;

  if not found or not v_settings.is_enabled then
    raise exception 'loyalty is disabled' using errcode = 'TB020';
  end if;

  perform pg_advisory_xact_lock(hashtext('loyalty:' || p_customer_id::text));

  if public.get_loyalty_balance(p_customer_id) < v_settings.stamps_required then
    raise exception 'not enough stamps' using errcode = 'TB022';
  end if;

  insert into public.loyalty_transactions (organization_id, customer_id, kind, stamps, note)
  values (
    v_organization_id,
    p_customer_id,
    'redeem',
    -v_settings.stamps_required,
    nullif(v_settings.reward_description, '')
  );

  return public.get_loyalty_balance(p_customer_id);
end;
$$;

revoke execute on function public.redeem_loyalty_reward from public, anon;
grant execute on function public.redeem_loyalty_reward to authenticated;

create function public.adjust_loyalty_stamps(
  p_customer_id uuid,
  p_stamps integer,
  p_note text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  select organization_id into v_organization_id
    from public.loyalty_customers
   where id = p_customer_id;

  if v_organization_id is null
     or not public.has_role(v_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_stamps = 0 then
    raise exception 'stamps must not be zero' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('loyalty:' || p_customer_id::text));

  if public.get_loyalty_balance(p_customer_id) + p_stamps < 0 then
    raise exception 'balance would be negative' using errcode = 'TB022';
  end if;

  insert into public.loyalty_transactions (organization_id, customer_id, kind, stamps, note)
  values (
    v_organization_id,
    p_customer_id,
    'adjust',
    p_stamps,
    nullif(trim(coalesce(p_note, '')), '')
  );

  return public.get_loyalty_balance(p_customer_id);
end;
$$;

revoke execute on function public.adjust_loyalty_stamps from public, anon;
grant execute on function public.adjust_loyalty_stamps to authenticated;
