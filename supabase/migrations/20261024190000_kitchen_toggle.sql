create function public.is_kitchen_enabled(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not coalesce((
    select 'kitchen' = any (hidden_modules)
      from public.organizations
     where id = p_organization_id
  ), false);
$$;

revoke execute on function public.is_kitchen_enabled from public, anon;
grant execute on function public.is_kitchen_enabled to authenticated;

create function public.release_kitchen_when_hidden()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if 'kitchen' = any (new.hidden_modules)
     and not ('kitchen' = any (coalesce(old.hidden_modules, '{}'))) then
    update public.kitchen_tickets
       set status = 'delivered',
           ready_at = coalesce(ready_at, now()),
           delivered_at = now()
     where organization_id = new.id
       and status <> 'delivered';

    update public.orders
       set status = 'completed'
     where organization_id = new.id
       and paid_at is not null
       and status in ('in_kitchen', 'ready');
  end if;
  return new;
end;
$$;

revoke execute on function public.release_kitchen_when_hidden from public, anon, authenticated;

create trigger organizations_release_kitchen_when_hidden
  after update of hidden_modules on public.organizations
  for each row execute function public.release_kitchen_when_hidden();

create or replace function public.place_order(p_organization_id uuid, p_items jsonb, p_note text DEFAULT NULL::text, p_payment_method public.payment_method DEFAULT NULL::public.payment_method, p_amount_received numeric DEFAULT NULL::numeric, p_customer_name text DEFAULT NULL::text, p_is_takeaway boolean DEFAULT false, p_send_to_kitchen boolean DEFAULT true, p_customer_account_id uuid DEFAULT NULL::uuid, p_request_id uuid DEFAULT NULL::uuid, p_placed_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_payments jsonb DEFAULT NULL::jsonb, p_discount_type text DEFAULT NULL::text, p_discount_value numeric DEFAULT NULL::numeric, p_has_service_fee boolean DEFAULT false, p_loyalty_phone text DEFAULT NULL::text, p_loyalty_reward_product_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(order_id uuid, order_number integer, order_total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order_id uuid;
  v_order_number integer;
  v_subtotal numeric(12, 2);
  v_takeaway_fee numeric(12, 2) := 0;
  v_total numeric(12, 2);
  v_item_count integer;
  v_valid_item_count integer;
  v_items jsonb;
  v_is_takeaway boolean := false;
  v_payments jsonb := public.normalize_order_payments(
    p_payments, p_payment_method, p_amount_received, p_customer_account_id
  );
  v_is_open boolean;
  v_is_offline boolean := p_placed_at is not null;
  v_placed_at timestamptz := least(coalesce(p_placed_at, now()), now());
  v_customer_name text := nullif(trim(p_customer_name), '');
  v_ticket_id uuid;
  v_is_paying boolean;
  v_sends_to_kitchen boolean;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  v_is_paying := v_payments is not null or p_loyalty_reward_product_id is not null;
  v_sends_to_kitchen := coalesce(p_send_to_kitchen, true) and public.is_kitchen_enabled(p_organization_id);
  v_is_open := v_sends_to_kitchen or not v_is_paying;

  if p_request_id is not null then
    perform pg_advisory_xact_lock(hashtext(p_request_id::text));

    if exists (
      select 1 from public.order_requests
       where id = p_request_id and organization_id <> p_organization_id
    ) then
      raise exception 'offline request belongs to another organization' using errcode = '42501';
    end if;

    return query
      select o.id, o.number, o.total
        from public.order_requests as r
        join public.orders as o on o.id = r.order_id
       where r.id = p_request_id;
    if found then
      return;
    end if;
  end if;

  drop table if exists requested_items;

  create temporary table requested_items on commit drop as
  select
    (item ->> 'product_id')::uuid as product_id,
    nullif(left(trim(item ->> 'note'), 140), '') as note,
    sum((item ->> 'quantity')::integer) as quantity
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  group by 1, 2;

  select count(*) into v_item_count from requested_items;

  if v_item_count = 0 then
    raise exception 'order has no items' using errcode = '22023';
  end if;

  if exists (select 1 from requested_items where quantity is null or quantity <= 0) then
    raise exception 'invalid item quantity' using errcode = '22023';
  end if;

  select count(*), coalesce(sum(p.price * requested.quantity), 0)
    into v_valid_item_count, v_subtotal
    from requested_items as requested
    join public.products as p
      on p.id = requested.product_id
     and p.organization_id = p_organization_id
     and (p.is_active or v_is_offline);

  if v_valid_item_count <> v_item_count then
    raise exception 'unavailable product in order' using errcode = 'P0002';
  end if;

  select coalesce(p_is_takeaway, false) and o.is_takeaway_enabled
    into v_is_takeaway
    from public.organizations as o
   where o.id = p_organization_id;

  if v_is_takeaway then
    select takeaway_fee into v_takeaway_fee
      from public.organizations
     where id = p_organization_id;
  end if;

  v_total := v_subtotal + v_takeaway_fee;

  if v_is_open and v_customer_name is not null then
    if v_is_offline then
      v_customer_name := public.resolve_offline_customer_name(p_organization_id, v_customer_name);
    else
      perform pg_advisory_xact_lock(
        hashtext(p_organization_id::text || ':' || lower(v_customer_name))
      );

      if public.is_customer_name_in_use(p_organization_id, v_customer_name) then
        raise exception 'customer name already in use' using errcode = 'TB002';
      end if;
    end if;
  end if;

  update public.organizations
     set last_order_number = last_order_number + 1
   where id = p_organization_id
  returning last_order_number into v_order_number;

  insert into public.orders (
    organization_id, number, status, note, customer_name, is_takeaway,
    subtotal, takeaway_fee, total, created_at
  )
  values (
    p_organization_id,
    v_order_number,
    case when v_is_open then 'in_kitchen' else 'completed' end::public.order_status,
    nullif(trim(p_note), ''),
    v_customer_name,
    v_is_takeaway,
    v_subtotal,
    v_takeaway_fee,
    v_total,
    v_placed_at
  )
  returning id into v_order_id;

  if v_is_paying then
    if p_loyalty_reward_product_id is not null then
      perform public.apply_loyalty_reward(
        v_order_id,
        p_loyalty_phone,
        (select p.price
           from requested_items as requested
           join public.products as p on p.id = requested.product_id
          where requested.product_id = p_loyalty_reward_product_id
          limit 1),
        (select p.name
           from public.products as p
          where p.id = p_loyalty_reward_product_id
            and exists (select 1 from requested_items where product_id = p.id))
      );
    end if;

    v_total := public.apply_order_adjustments(
      v_order_id, p_discount_type, p_discount_value, coalesce(p_has_service_fee, false)
    );
    perform public.settle_order(p_organization_id, v_order_id, v_payments, v_total, v_placed_at);
  end if;

  insert into public.order_items (
    organization_id, order_id, product_id, product_name, quantity, unit_price, note
  )
  select p_organization_id, v_order_id, p.id, p.name, requested.quantity, p.price, requested.note
    from requested_items as requested
    join public.products as p on p.id = requested.product_id;

  select jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity, 'note', note))
    into v_items
    from requested_items;

  if v_sends_to_kitchen then
    v_ticket_id := public.create_kitchen_ticket(p_organization_id, v_order_id, v_items, p_note, false);

    if v_is_offline then
      perform public.deliver_offline_kitchen_ticket(v_ticket_id, v_placed_at);
      perform public.complete_order_if_done(v_order_id);
    end if;
  end if;

  perform public.move_order_stock(p_organization_id, v_order_id, v_items, false, v_is_offline);

  if p_request_id is not null then
    insert into public.order_requests (id, organization_id, order_id)
    values (p_request_id, p_organization_id, v_order_id);
  end if;

  return query select v_order_id, v_order_number, v_total;
end;
$function$;

create or replace function public.add_order_items(p_order_id uuid, p_items jsonb, p_note text DEFAULT NULL::text, p_request_id uuid DEFAULT NULL::uuid, p_placed_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders;
  v_added numeric(12, 2);
  v_item_count integer;
  v_valid_item_count integer;
  v_items jsonb;
  v_total numeric(12, 2);
  v_is_offline boolean := p_placed_at is not null;
  v_ticket_id uuid;
begin
  if p_request_id is not null then
    perform pg_advisory_xact_lock(hashtext(p_request_id::text));

    select o.total into v_total
      from public.order_requests as r
      join public.orders as o on o.id = r.order_id
     where r.id = p_request_id
       and r.order_id = p_order_id
       and public.is_member(o.organization_id);
    if found then
      return v_total;
    end if;
  end if;

  v_order := public.lock_open_order(p_order_id);

  drop table if exists requested_items;

  create temporary table requested_items on commit drop as
  select
    (item ->> 'product_id')::uuid as product_id,
    nullif(left(trim(item ->> 'note'), 140), '') as note,
    sum((item ->> 'quantity')::integer) as quantity
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  group by 1, 2;

  select count(*) into v_item_count from requested_items;

  if v_item_count = 0 or exists (
    select 1 from requested_items where quantity is null or quantity <= 0
  ) then
    raise exception 'invalid items' using errcode = '22023';
  end if;

  select count(*), coalesce(sum(p.price * requested.quantity), 0)
    into v_valid_item_count, v_added
    from requested_items as requested
    join public.products as p
      on p.id = requested.product_id
     and p.organization_id = v_order.organization_id
     and (p.is_active or v_is_offline);

  if v_valid_item_count <> v_item_count then
    raise exception 'unavailable product in order' using errcode = 'P0002';
  end if;

  update public.order_items as oi
     set quantity = oi.quantity + requested.quantity
    from requested_items as requested
    join public.products as p on p.id = requested.product_id
   where oi.order_id = p_order_id
     and oi.product_id = requested.product_id
     and oi.unit_price = p.price
     and oi.note is not distinct from requested.note;

  insert into public.order_items (
    organization_id, order_id, product_id, product_name, quantity, unit_price, note
  )
  select v_order.organization_id, p_order_id, p.id, p.name, requested.quantity, p.price, requested.note
    from requested_items as requested
    join public.products as p on p.id = requested.product_id
   where not exists (
     select 1
       from public.order_items as oi
      where oi.order_id = p_order_id
        and oi.product_id = requested.product_id
        and oi.unit_price = p.price
        and oi.note is not distinct from requested.note
   );

  select jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity, 'note', note))
    into v_items
    from requested_items;

  if public.is_kitchen_enabled(v_order.organization_id) then
    v_ticket_id := public.create_kitchen_ticket(v_order.organization_id, p_order_id, v_items, p_note, true);

    if v_is_offline then
      perform public.deliver_offline_kitchen_ticket(
        v_ticket_id,
        least(coalesce(p_placed_at, now()), now())
      );
    end if;
  end if;

  perform public.move_order_stock(v_order.organization_id, p_order_id, v_items, false, v_is_offline);

  update public.orders
     set subtotal = subtotal + v_added,
         total = total + v_added
   where id = p_order_id
  returning total into v_total;

  if p_request_id is not null then
    insert into public.order_requests (id, organization_id, order_id)
    values (p_request_id, v_order.organization_id, p_order_id);
  end if;

  return v_total;
end;
$function$;

create or replace function public.is_customer_name_in_use(p_organization_id uuid, p_customer_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select exists (
    select 1
      from public.orders as o
     where o.organization_id = p_organization_id
       and o.paid_at is null
       and o.status <> 'canceled'
       and lower(o.customer_name) = lower(trim(p_customer_name))
  )
  or exists (
    select 1
      from public.kitchen_tickets as t
      join public.orders as o on o.id = t.order_id
     where t.organization_id = p_organization_id
       and t.status <> 'delivered'
       and o.status <> 'canceled'
       and public.is_kitchen_enabled(p_organization_id)
       and lower(o.customer_name) = lower(trim(p_customer_name))
  );
$function$;
