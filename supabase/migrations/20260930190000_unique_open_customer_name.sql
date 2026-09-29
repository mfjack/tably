alter table public.organizations
  add column timezone text not null default 'America/Sao_Paulo';

create index orders_open_customer_name_idx
  on public.orders (organization_id, lower(customer_name))
  where status in ('in_kitchen', 'ready');

create function public.is_customer_name_in_use(
  p_organization_id uuid,
  p_customer_name text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
      from public.orders as o
      join public.organizations as org on org.id = o.organization_id
     where o.organization_id = p_organization_id
       and o.status in ('in_kitchen', 'ready')
       and lower(o.customer_name) = lower(trim(p_customer_name))
       and (o.created_at at time zone org.timezone)::date = (now() at time zone org.timezone)::date
  );
$$;

revoke execute on function public.is_customer_name_in_use from public, anon;
grant execute on function public.is_customer_name_in_use to authenticated;

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
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

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

  if coalesce(p_is_takeaway, false) then
    select takeaway_fee into v_takeaway_fee
      from public.organizations
     where id = p_organization_id;
  end if;

  v_total := v_subtotal + v_takeaway_fee;

  if coalesce(p_send_to_kitchen, true) and nullif(trim(p_customer_name), '') is not null then
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

  create temporary table consumed_ingredients on commit drop as
  select pi.ingredient_id, sum(pi.quantity * requested.quantity) as quantity
    from requested_items as requested
    join public.product_ingredients as pi on pi.product_id = requested.product_id
   group by pi.ingredient_id;

  perform 1
     from public.ingredients as i
     join consumed_ingredients as consumed on consumed.ingredient_id = i.id
    where i.organization_id = p_organization_id
      for update of i;

  if exists (
    select 1
      from consumed_ingredients as consumed
      join public.ingredients as i on i.id = consumed.ingredient_id
     where i.current_stock < consumed.quantity
  ) then
    raise exception 'insufficient stock' using errcode = 'TB001';
  end if;

  update public.organizations
     set last_order_number = last_order_number + 1
   where id = p_organization_id
  returning last_order_number into v_order_number;

  insert into public.orders (
    organization_id, number, status, note, customer_name, is_takeaway,
    subtotal, takeaway_fee, total, payment_method, amount_received, paid_at
  )
  values (
    p_organization_id,
    v_order_number,
    case when coalesce(p_send_to_kitchen, true) then 'in_kitchen' else 'completed' end::public.order_status,
    nullif(trim(p_note), ''),
    nullif(trim(p_customer_name), ''),
    coalesce(p_is_takeaway, false),
    v_subtotal,
    v_takeaway_fee,
    v_total,
    p_payment_method,
    case when p_payment_method = 'cash' then p_amount_received end,
    case when p_payment_method is not null then now() end
  )
  returning id into v_order_id;

  insert into public.order_items (
    organization_id, order_id, product_id, product_name, quantity, unit_price
  )
  select p_organization_id, v_order_id, p.id, p.name, requested.quantity, p.price
    from requested_items as requested
    join public.products as p on p.id = requested.product_id;

  update public.ingredients as i
     set current_stock = i.current_stock - consumed.quantity
    from consumed_ingredients as consumed
   where i.id = consumed.ingredient_id
     and i.organization_id = p_organization_id;

  insert into public.stock_movements (organization_id, ingredient_id, order_id, quantity)
  select p_organization_id, consumed.ingredient_id, v_order_id, -consumed.quantity
    from consumed_ingredients as consumed;

  return query select v_order_id, v_order_number, v_total;
end;
$$;

