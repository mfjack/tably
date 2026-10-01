alter table public.organizations
  add column service_fee_percent numeric(4, 1) not null default 0
    check (service_fee_percent between 0 and 30);

alter table public.orders
  add column discount_type text check (discount_type in ('percent', 'amount')),
  add column discount_value numeric(12, 2) check (discount_value > 0),
  add column discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  add column service_fee_percent numeric(4, 1),
  add column service_fee_amount numeric(12, 2) not null default 0 check (service_fee_amount >= 0),
  add column discounted_by uuid references auth.users (id) on delete set null;

create function public.apply_order_adjustments(
  p_order_id uuid,
  p_discount_type text,
  p_discount_value numeric,
  p_has_service_fee boolean
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_fee_percent numeric(4, 1) := 0;
  v_service_fee numeric(12, 2) := 0;
  v_base numeric(12, 2);
  v_discount_value numeric(12, 2);
  v_discount numeric(12, 2) := 0;
  v_total numeric(12, 2);
begin
  select * into v_order from public.orders where id = p_order_id;

  if p_has_service_fee and not v_order.is_takeaway then
    select service_fee_percent into v_fee_percent
      from public.organizations
     where id = v_order.organization_id;
    v_service_fee := round(v_order.subtotal * v_fee_percent / 100, 2);
  end if;

  v_base := v_order.subtotal + v_order.takeaway_fee;

  if p_discount_type = 'percent' then
    v_discount_value := round(p_discount_value, 1);
    if v_discount_value is null or v_discount_value <= 0 or v_discount_value >= 100 then
      raise exception 'invalid discount' using errcode = 'TB014';
    end if;
    v_discount := round(v_base * v_discount_value / 100, 2);
  elsif p_discount_type = 'amount' then
    v_discount_value := round(p_discount_value, 2);
    if v_discount_value is null or v_discount_value <= 0 or v_discount_value >= v_base then
      raise exception 'invalid discount' using errcode = 'TB014';
    end if;
    v_discount := v_discount_value;
  elsif p_discount_type is not null then
    raise exception 'invalid discount' using errcode = 'TB014';
  end if;

  v_total := v_base + v_service_fee - v_discount;

  update public.orders
     set service_fee_percent = nullif(v_fee_percent, 0),
         service_fee_amount = v_service_fee,
         discount_type = case when v_discount > 0 then p_discount_type end,
         discount_value = case when v_discount > 0 then v_discount_value end,
         discount_amount = v_discount,
         discounted_by = case when v_discount > 0 then auth.uid() end,
         total = v_total
   where id = p_order_id;

  return v_total;
end;
$$;

revoke execute on function public.apply_order_adjustments from public, anon, authenticated;

drop function public.place_order(uuid, jsonb, text, public.payment_method, numeric, text, boolean, boolean, uuid, uuid, timestamptz, jsonb);

create function public.place_order(
  p_organization_id uuid,
  p_items jsonb,
  p_note text default null,
  p_payment_method public.payment_method default null,
  p_amount_received numeric default null,
  p_customer_name text default null,
  p_is_takeaway boolean default false,
  p_send_to_kitchen boolean default true,
  p_customer_account_id uuid default null,
  p_request_id uuid default null,
  p_placed_at timestamptz default null,
  p_payments jsonb default null,
  p_discount_type text default null,
  p_discount_value numeric default null,
  p_has_service_fee boolean default false
)
returns table (order_id uuid, order_number integer, order_total numeric)
language plpgsql
security definer
set search_path = ''
as $$
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
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  v_is_open := coalesce(p_send_to_kitchen, true) or v_payments is null;

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

  if v_payments is not null then
    v_total := public.apply_order_adjustments(
      v_order_id, p_discount_type, p_discount_value, coalesce(p_has_service_fee, false)
    );
    perform public.record_order_payments(p_organization_id, v_order_id, v_payments, v_total, v_placed_at);
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

  if coalesce(p_send_to_kitchen, true) then
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
$$;

revoke execute on function public.place_order from public, anon;
grant execute on function public.place_order to authenticated;

drop function public.pay_order(uuid, public.payment_method, numeric, uuid, jsonb);

create function public.pay_order(
  p_order_id uuid,
  p_payment_method public.payment_method default null,
  p_amount_received numeric default null,
  p_customer_account_id uuid default null,
  p_payments jsonb default null,
  p_discount_type text default null,
  p_discount_value numeric default null,
  p_has_service_fee boolean default false
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_total numeric(12, 2);
  v_payments jsonb := public.normalize_order_payments(
    p_payments, p_payment_method, p_amount_received, p_customer_account_id
  );
begin
  v_order := public.lock_open_order(p_order_id);

  if not exists (select 1 from public.order_items where order_id = p_order_id) then
    raise exception 'order has no items' using errcode = '22023';
  end if;

  if v_payments is null then
    raise exception 'payment is required' using errcode = '22023';
  end if;

  v_total := public.apply_order_adjustments(
    p_order_id, p_discount_type, p_discount_value, coalesce(p_has_service_fee, false)
  );
  perform public.record_order_payments(v_order.organization_id, p_order_id, v_payments, v_total, now());
  perform public.complete_order_if_done(p_order_id);

  return v_total;
end;
$$;

revoke execute on function public.pay_order from public, anon;
grant execute on function public.pay_order to authenticated;
