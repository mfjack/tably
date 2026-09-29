alter table public.organizations
  add column tax_id text check (tax_id ~ '^[0-9]{14}$'),
  add column phone text check (phone ~ '^[0-9]{10,11}$'),
  add column address text check (char_length(address) <= 200),
  add column is_takeaway_enabled boolean not null default true;

create or replace function public.place_order(
  p_organization_id uuid,
  p_items jsonb,
  p_note text default null,
  p_payment_method public.payment_method default null,
  p_amount_received numeric default null,
  p_customer_name text default null,
  p_is_takeaway boolean default false,
  p_send_to_kitchen boolean default true
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
  v_is_open boolean := coalesce(p_send_to_kitchen, true) or p_payment_method is null;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  drop table if exists requested_items;

  create temporary table requested_items on commit drop as
  select
    (item ->> 'product_id')::uuid as product_id,
    sum((item ->> 'quantity')::integer) as quantity
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  group by 1;

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
     and p.is_active;

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

  if v_is_open and nullif(trim(p_customer_name), '') is not null then
    perform pg_advisory_xact_lock(
      hashtext(p_organization_id::text || ':' || lower(trim(p_customer_name)))
    );

    if public.is_customer_name_in_use(p_organization_id, p_customer_name) then
      raise exception 'customer name already in use' using errcode = 'TB002';
    end if;
  end if;

  if p_payment_method = 'cash' and coalesce(p_amount_received, 0) < v_total then
    raise exception 'amount received is lower than total' using errcode = '22023';
  end if;

  update public.organizations
     set last_order_number = last_order_number + 1
   where id = p_organization_id
  returning last_order_number into v_order_number;

  insert into public.orders (
    organization_id, number, status, note, customer_name, is_takeaway,
    subtotal, takeaway_fee, total, payment_method, amount_received, paid_at, paid_by
  )
  values (
    p_organization_id,
    v_order_number,
    case when v_is_open then 'in_kitchen' else 'completed' end::public.order_status,
    nullif(trim(p_note), ''),
    nullif(trim(p_customer_name), ''),
    v_is_takeaway,
    v_subtotal,
    v_takeaway_fee,
    v_total,
    p_payment_method,
    case when p_payment_method = 'cash' then p_amount_received end,
    case when p_payment_method is not null then now() end,
    case when p_payment_method is not null then auth.uid() end
  )
  returning id into v_order_id;

  insert into public.order_items (
    organization_id, order_id, product_id, product_name, quantity, unit_price
  )
  select p_organization_id, v_order_id, p.id, p.name, requested.quantity, p.price
    from requested_items as requested
    join public.products as p on p.id = requested.product_id;

  select jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity))
    into v_items
    from requested_items;

  if coalesce(p_send_to_kitchen, true) then
    perform public.create_kitchen_ticket(p_organization_id, v_order_id, v_items, p_note, false);
  end if;

  perform public.move_order_stock(p_organization_id, v_order_id, v_items, false);

  return query select v_order_id, v_order_number, v_total;
end;
$$;
