create type public.kitchen_ticket_status as enum ('preparing', 'ready', 'delivered');

create table public.kitchen_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null,
  status public.kitchen_ticket_status not null default 'preparing',
  note text check (char_length(note) <= 500),
  is_addition boolean not null default false,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  delivered_at timestamptz,
  unique (id, organization_id),
  foreign key (order_id, organization_id)
    references public.orders (id, organization_id) on delete cascade
);

create index kitchen_tickets_active_idx
  on public.kitchen_tickets (organization_id, created_at)
  where status <> 'delivered';

create index kitchen_tickets_order_id_idx on public.kitchen_tickets (order_id);

create table public.kitchen_ticket_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ticket_id uuid not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  foreign key (ticket_id, organization_id)
    references public.kitchen_tickets (id, organization_id) on delete cascade
);

create index kitchen_ticket_items_ticket_id_idx on public.kitchen_ticket_items (ticket_id);

alter table public.kitchen_tickets enable row level security;
alter table public.kitchen_ticket_items enable row level security;

create policy "kitchen_tickets: members read" on public.kitchen_tickets
  for select to authenticated using (public.is_member(organization_id));

create policy "kitchen_ticket_items: members read" on public.kitchen_ticket_items
  for select to authenticated using (public.is_member(organization_id));

alter publication supabase_realtime add table public.kitchen_tickets;

create function public.create_kitchen_ticket(
  p_organization_id uuid,
  p_order_id uuid,
  p_items jsonb,
  p_note text,
  p_is_addition boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket_id uuid;
begin
  insert into public.kitchen_tickets (organization_id, order_id, note, is_addition)
  values (p_organization_id, p_order_id, nullif(trim(p_note), ''), p_is_addition)
  returning id into v_ticket_id;

  insert into public.kitchen_ticket_items (organization_id, ticket_id, product_name, quantity)
  select p_organization_id, v_ticket_id, p.name, (item ->> 'quantity')::integer
    from jsonb_array_elements(p_items) as item
    join public.products as p
      on p.id = (item ->> 'product_id')::uuid
     and p.organization_id = p_organization_id;

  return v_ticket_id;
end;
$$;

revoke execute on function public.create_kitchen_ticket from public, anon, authenticated;

create function public.complete_order_if_done(p_order_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders
     set status = 'completed'
   where id = p_order_id
     and paid_at is not null
     and status in ('in_kitchen', 'ready')
     and not exists (
       select 1
         from public.kitchen_tickets as t
        where t.order_id = p_order_id
          and t.status <> 'delivered'
     );
$$;

revoke execute on function public.complete_order_if_done from public, anon, authenticated;

create function public.set_kitchen_ticket_status(
  p_ticket_id uuid,
  p_status public.kitchen_ticket_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.kitchen_tickets;
begin
  select * into v_ticket from public.kitchen_tickets where id = p_ticket_id for update;

  if not found or not public.is_member(v_ticket.organization_id) then
    raise exception 'kitchen ticket not found' using errcode = 'P0002';
  end if;

  update public.kitchen_tickets
     set status = p_status,
         ready_at = case
           when p_status = 'preparing' then null
           else coalesce(ready_at, now())
         end,
         delivered_at = case when p_status = 'delivered' then now() end
   where id = p_ticket_id;

  perform public.complete_order_if_done(v_ticket.order_id);
end;
$$;

revoke execute on function public.set_kitchen_ticket_status from public, anon;

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

  if coalesce(p_send_to_kitchen, true) then
    perform public.create_kitchen_ticket(p_organization_id, v_order_id, v_items, p_note, false);
  end if;

  perform public.move_order_stock(p_organization_id, v_order_id, v_items, false);

  return query select v_order_id, v_order_number, v_total;
end;
$$;

drop function public.add_order_items(uuid, jsonb);

create function public.add_order_items(
  p_order_id uuid,
  p_items jsonb,
  p_note text default null
)
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

  perform public.create_kitchen_ticket(v_order.organization_id, p_order_id, v_items, p_note, true);

  perform public.move_order_stock(v_order.organization_id, p_order_id, v_items, false);

  update public.orders
     set subtotal = subtotal + v_added,
         total = total + v_added
   where id = p_order_id
  returning total into v_total;

  return v_total;
end;
$$;

revoke execute on function public.add_order_items from public, anon;

create or replace function public.pay_order(
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

  perform public.complete_order_if_done(p_order_id);

  return v_order.total;
end;
$$;
