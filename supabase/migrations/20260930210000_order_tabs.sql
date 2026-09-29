insert into public.profiles (id, full_name, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  u.raw_user_meta_data ->> 'avatar_url'
  from auth.users as u
 where not exists (select 1 from public.profiles as p where p.id = u.id);

alter table public.orders
  add column paid_by uuid,
  add constraint orders_created_by_profile_fkey
    foreign key (created_by) references public.profiles (id) on delete set null,
  add constraint orders_paid_by_profile_fkey
    foreign key (paid_by) references public.profiles (id) on delete set null;

create index orders_open_tabs_idx
  on public.orders (organization_id, created_at)
  where paid_at is null and status <> 'canceled';

create index orders_paid_at_idx
  on public.orders (organization_id, paid_at desc)
  where paid_at is not null;

create function public.move_order_stock(
  p_organization_id uuid,
  p_order_id uuid,
  p_items jsonb,
  p_is_return boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  drop table if exists stock_changes;

  create temporary table stock_changes on commit drop as
  select pi.ingredient_id, sum(pi.quantity * (item ->> 'quantity')::numeric) as quantity
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
    join public.product_ingredients as pi on pi.product_id = (item ->> 'product_id')::uuid
   group by pi.ingredient_id;

  if not p_is_return then
    perform 1
       from public.ingredients as i
       join stock_changes as change on change.ingredient_id = i.id
      where i.organization_id = p_organization_id
        for update of i;

    if exists (
      select 1
        from stock_changes as change
        join public.ingredients as i on i.id = change.ingredient_id
       where i.current_stock < change.quantity
    ) then
      raise exception 'insufficient stock' using errcode = 'TB001';
    end if;
  end if;

  update public.ingredients as i
     set current_stock = i.current_stock
       + case when p_is_return then change.quantity else -change.quantity end
    from stock_changes as change
   where i.id = change.ingredient_id
     and i.organization_id = p_organization_id;

  insert into public.stock_movements (organization_id, ingredient_id, order_id, quantity)
  select
    p_organization_id,
    change.ingredient_id,
    p_order_id,
    case when p_is_return then change.quantity else -change.quantity end
    from stock_changes as change;

  drop table stock_changes;
end;
$$;

revoke execute on function public.move_order_stock from public, anon, authenticated;

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
    case when coalesce(p_send_to_kitchen, true) then 'in_kitchen' else 'completed' end::public.order_status,
    nullif(trim(p_note), ''),
    nullif(trim(p_customer_name), ''),
    coalesce(p_is_takeaway, false),
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

  perform public.move_order_stock(p_organization_id, v_order_id, v_items, false);

  return query select v_order_id, v_order_number, v_total;
end;
$$;

create function public.lock_open_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if not found or not public.is_member(v_order.organization_id) then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.paid_at is not null or v_order.status = 'canceled' then
    raise exception 'order is closed' using errcode = 'TB003';
  end if;

  return v_order;
end;
$$;

revoke execute on function public.lock_open_order from public, anon, authenticated;

create function public.add_order_items(p_order_id uuid, p_items jsonb)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_added numeric(12, 2);
  v_item_count integer;
  v_valid_item_count integer;
  v_items jsonb;
  v_total numeric(12, 2);
begin
  v_order := public.lock_open_order(p_order_id);

  drop table if exists requested_items;

  create temporary table requested_items on commit drop as
  select
    (item ->> 'product_id')::uuid as product_id,
    sum((item ->> 'quantity')::integer) as quantity
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  group by 1;

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
     and p.is_active;

  if v_valid_item_count <> v_item_count then
    raise exception 'unavailable product in order' using errcode = 'P0002';
  end if;

  update public.order_items as oi
     set quantity = oi.quantity + requested.quantity
    from requested_items as requested
    join public.products as p on p.id = requested.product_id
   where oi.order_id = p_order_id
     and oi.product_id = requested.product_id
     and oi.unit_price = p.price;

  insert into public.order_items (
    organization_id, order_id, product_id, product_name, quantity, unit_price
  )
  select v_order.organization_id, p_order_id, p.id, p.name, requested.quantity, p.price
    from requested_items as requested
    join public.products as p on p.id = requested.product_id
   where not exists (
     select 1
       from public.order_items as oi
      where oi.order_id = p_order_id
        and oi.product_id = requested.product_id
        and oi.unit_price = p.price
   );

  select jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity))
    into v_items
    from requested_items;

  perform public.move_order_stock(v_order.organization_id, p_order_id, v_items, false);

  update public.orders
     set subtotal = subtotal + v_added,
         total = total + v_added
   where id = p_order_id
  returning total into v_total;

  return v_total;
end;
$$;

create function public.remove_order_item(p_order_item_id uuid, p_quantity integer default 1)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.order_items;
  v_order public.orders;
  v_removed_quantity integer;
  v_total numeric(12, 2);
begin
  select * into v_item from public.order_items where id = p_order_item_id;

  if not found then
    raise exception 'order item not found' using errcode = 'P0002';
  end if;

  v_order := public.lock_open_order(v_item.order_id);

  if coalesce(p_quantity, 0) <= 0 then
    raise exception 'invalid quantity' using errcode = '22023';
  end if;

  v_removed_quantity := least(p_quantity, v_item.quantity);

  if v_removed_quantity = v_item.quantity then
    delete from public.order_items where id = p_order_item_id;
  else
    update public.order_items
       set quantity = quantity - v_removed_quantity
     where id = p_order_item_id;
  end if;

  if v_item.product_id is not null then
    perform public.move_order_stock(
      v_order.organization_id,
      v_order.id,
      jsonb_build_array(
        jsonb_build_object('product_id', v_item.product_id, 'quantity', v_removed_quantity)
      ),
      true
    );
  end if;

  update public.orders
     set subtotal = subtotal - v_item.unit_price * v_removed_quantity,
         total = total - v_item.unit_price * v_removed_quantity
   where id = v_order.id
  returning total into v_total;

  return v_total;
end;
$$;

create function public.pay_order(
  p_order_id uuid,
  p_payment_method public.payment_method,
  p_amount_received numeric default null
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  v_order := public.lock_open_order(p_order_id);

  if not exists (select 1 from public.order_items where order_id = p_order_id) then
    raise exception 'order has no items' using errcode = '22023';
  end if;

  if p_payment_method = 'cash' and coalesce(p_amount_received, 0) < v_order.total then
    raise exception 'amount received is lower than total' using errcode = '22023';
  end if;

  update public.orders
     set payment_method = p_payment_method,
         amount_received = case when p_payment_method = 'cash' then p_amount_received end,
         paid_at = now(),
         paid_by = auth.uid()
   where id = p_order_id;

  return v_order.total;
end;
$$;

create function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  v_order := public.lock_open_order(p_order_id);

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
     and i.organization_id = v_order.organization_id;

  insert into public.stock_movements (organization_id, ingredient_id, order_id, quantity)
  select v_order.organization_id, ingredient_id, p_order_id, -sum(quantity)
    from public.stock_movements
   where order_id = p_order_id
   group by ingredient_id
  having sum(quantity) <> 0;

  update public.orders set status = 'canceled' where id = p_order_id;
end;
$$;

revoke execute on function public.add_order_items from public, anon;
revoke execute on function public.remove_order_item from public, anon;
revoke execute on function public.pay_order from public, anon;
revoke execute on function public.cancel_order from public, anon;
grant execute on function public.add_order_items to authenticated;
grant execute on function public.remove_order_item to authenticated;
grant execute on function public.pay_order to authenticated;
grant execute on function public.cancel_order to authenticated;
