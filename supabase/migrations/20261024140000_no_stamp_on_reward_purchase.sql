create or replace function public.record_loyalty_purchase(p_order_id uuid, p_phone text, p_name text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  perform pg_advisory_xact_lock(hashtext('loyalty:' || v_customer_id::text));

  if v_order.total >= v_settings.minimum_purchase
     and v_order.loyalty_reward_amount = 0
     and not public.has_loyalty_stamp_today(v_customer_id) then
    insert into public.loyalty_transactions (organization_id, customer_id, order_id, kind, stamps)
    values (v_order.organization_id, v_customer_id, p_order_id, 'earn', 1)
    on conflict (order_id, kind) where order_id is not null do nothing;
  end if;

  return public.get_loyalty_balance(v_customer_id);
end;
$function$;
