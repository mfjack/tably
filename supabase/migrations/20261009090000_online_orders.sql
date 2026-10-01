alter table public.organizations
  add column is_online_ordering_enabled boolean not null default false,
  add column pos_seen_at timestamptz;

create type public.online_order_status as enum ('pending', 'accepted', 'rejected');

create table public.online_orders (
  id uuid primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  device_id uuid not null,
  customer_name text not null check (char_length(customer_name) between 1 and 60),
  note text check (char_length(note) <= 200),
  items jsonb not null,
  total numeric(12, 2) not null check (total >= 0),
  status public.online_order_status not null default 'pending',
  order_id uuid references public.orders (id) on delete set null,
  accepted_customer_name text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null
);

create index online_orders_organization_status_idx
  on public.online_orders (organization_id, status, created_at);

create index online_orders_device_created_at_idx
  on public.online_orders (device_id, created_at desc);

alter table public.online_orders enable row level security;

create policy "online_orders: members read" on public.online_orders
  for select to authenticated using (public.is_member(organization_id));

alter publication supabase_realtime add table public.online_orders;

create function public.is_accepting_online_orders(p_organization public.organizations)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_organization.is_menu_published
     and p_organization.is_online_ordering_enabled
     and coalesce(p_organization.pos_seen_at > now() - interval '3 minutes', false);
$$;

revoke execute on function public.is_accepting_online_orders from public, anon, authenticated;

create or replace function public.get_public_menu(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'title', coalesce(nullif(trim(o.menu_title), ''), o.name),
    'tagline', o.menu_tagline,
    'instagram', o.menu_instagram,
    'note', o.menu_note,
    'acceptsOrders', public.is_accepting_online_orders(o),
    'sections', coalesce((
      select jsonb_agg(section.data order by section.created_at, section.position)
        from (
          select
            c.created_at,
            c.position,
            jsonb_build_object(
              'group', c.menu_group,
              'name', c.name,
              'isHighlighted', c.menu_is_highlighted,
              'items', jsonb_agg(
                jsonb_build_object(
                  'id', p.id,
                  'name', p.name,
                  'detail', p.menu_detail,
                  'price', p.price
                )
                order by p.created_at, p.name
              )
            ) as data
            from public.categories as c
            join public.products as p
              on p.category_id = c.id
             and p.is_active
             and p.is_on_menu
           where c.organization_id = o.id
             and c.menu_group is not null
           group by c.id
        ) as section
    ), '[]'::jsonb)
  )
    from public.organizations as o
   where o.slug = p_slug
     and o.is_menu_published;
$$;

create function public.place_online_order(
  p_slug text,
  p_online_order_id uuid,
  p_device_id uuid,
  p_customer_name text,
  p_items jsonb,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization public.organizations;
  v_existing public.online_orders;
  v_customer_name text := trim(coalesce(p_customer_name, ''));
  v_item_count integer;
  v_valid_item_count integer;
  v_items jsonb;
  v_total numeric(12, 2);
begin
  select * into v_organization from public.organizations where slug = p_slug;

  if not found or not v_organization.is_menu_published then
    raise exception 'menu not found' using errcode = 'P0002';
  end if;

  select * into v_existing from public.online_orders where id = p_online_order_id;

  if found then
    if v_existing.device_id <> p_device_id then
      raise exception 'online order belongs to another device' using errcode = '42501';
    end if;
    return v_existing.id;
  end if;

  if not public.is_accepting_online_orders(v_organization) then
    raise exception 'online ordering is closed' using errcode = 'TB010';
  end if;

  if char_length(v_customer_name) not between 1 and 60 then
    raise exception 'invalid customer name' using errcode = '22023';
  end if;

  if (
    select count(*) from public.online_orders
     where device_id = p_device_id
       and created_at > now() - interval '10 minutes'
  ) >= 5 or (
    select count(*) from public.online_orders
     where organization_id = v_organization.id
       and status = 'pending'
  ) >= 30 then
    raise exception 'too many online orders' using errcode = 'TB011';
  end if;

  drop table if exists requested_online_items;

  create temporary table requested_online_items on commit drop as
  select
    (item ->> 'product_id')::uuid as product_id,
    nullif(left(trim(item ->> 'note'), 140), '') as note,
    sum((item ->> 'quantity')::integer) as quantity
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  group by 1, 2;

  select count(*) into v_item_count from requested_online_items;

  if v_item_count = 0 or v_item_count > 30 then
    raise exception 'invalid online order items' using errcode = '22023';
  end if;

  if exists (
    select 1 from requested_online_items
     where quantity is null or quantity <= 0 or quantity > 50
  ) then
    raise exception 'invalid item quantity' using errcode = '22023';
  end if;

  select
    count(*),
    coalesce(sum(p.price * requested.quantity), 0),
    jsonb_agg(
      jsonb_build_object(
        'product_id', p.id,
        'name', p.name,
        'quantity', requested.quantity,
        'unit_price', p.price,
        'note', requested.note
      )
      order by c.created_at, c.position, p.created_at, p.name
    )
    into v_valid_item_count, v_total, v_items
    from requested_online_items as requested
    join public.products as p
      on p.id = requested.product_id
     and p.organization_id = v_organization.id
     and p.is_active
     and p.is_on_menu
    join public.categories as c
      on c.id = p.category_id
     and c.menu_group is not null;

  if v_valid_item_count <> v_item_count then
    raise exception 'unavailable product in online order' using errcode = 'P0002';
  end if;

  insert into public.online_orders (
    id, organization_id, device_id, customer_name, note, items, total
  )
  values (
    p_online_order_id,
    v_organization.id,
    p_device_id,
    v_customer_name,
    nullif(left(trim(p_note), 200), ''),
    v_items,
    v_total
  );

  return p_online_order_id;
end;
$$;

revoke execute on function public.place_online_order from public;
grant execute on function public.place_online_order to anon, authenticated;

create function public.get_online_order_status(p_online_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'menuSlug', o.slug,
    'menuTitle', coalesce(nullif(trim(o.menu_title), ''), o.name),
    'customerName', coalesce(oo.accepted_customer_name, oo.customer_name),
    'note', oo.note,
    'total', oo.total,
    'createdAt', oo.created_at,
    'items', oo.items,
    'stage', case
      when oo.status = 'pending' then 'pending'
      when oo.status = 'rejected' then 'rejected'
      when ord.status = 'canceled' then 'rejected'
      else coalesce((
        select case
          when bool_or(kt.status = 'preparing') then 'preparing'
          when bool_or(kt.status = 'waiting') then 'waiting'
          when bool_or(kt.status = 'ready') then 'ready'
          else 'delivered'
        end
          from public.kitchen_tickets as kt
         where kt.order_id = oo.order_id
      ), 'delivered')
    end
  )
    from public.online_orders as oo
    join public.organizations as o on o.id = oo.organization_id
    left join public.orders as ord on ord.id = oo.order_id
   where oo.id = p_online_order_id;
$$;

revoke execute on function public.get_online_order_status from public;
grant execute on function public.get_online_order_status to anon, authenticated;

create function public.accept_online_order(p_online_order_id uuid)
returns table (order_id uuid, customer_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_online_order public.online_orders;
  v_customer_name text;
  v_order_id uuid;
begin
  select * into v_online_order
    from public.online_orders
   where id = p_online_order_id
   for update;

  if not found or not public.is_member(v_online_order.organization_id) then
    raise exception 'online order not found' using errcode = 'P0002';
  end if;

  if v_online_order.status <> 'pending' then
    raise exception 'online order already decided' using errcode = 'TB012';
  end if;

  v_customer_name := public.resolve_offline_customer_name(
    v_online_order.organization_id,
    v_online_order.customer_name
  );

  select placed.order_id into v_order_id
    from public.place_order(
      p_organization_id => v_online_order.organization_id,
      p_items => (
        select jsonb_agg(
          jsonb_build_object(
            'product_id', item ->> 'product_id',
            'quantity', (item ->> 'quantity')::integer,
            'note', item ->> 'note'
          )
        )
          from jsonb_array_elements(v_online_order.items) as item
      ),
      p_note => v_online_order.note,
      p_customer_name => v_customer_name,
      p_is_takeaway => false,
      p_send_to_kitchen => true,
      p_request_id => v_online_order.id
    ) as placed;

  update public.online_orders
     set status = 'accepted',
         order_id = v_order_id,
         accepted_customer_name = v_customer_name,
         decided_at = now(),
         decided_by = auth.uid()
   where id = v_online_order.id;

  return query select v_order_id, v_customer_name;
end;
$$;

revoke execute on function public.accept_online_order from public, anon;
grant execute on function public.accept_online_order to authenticated;

create function public.reject_online_order(p_online_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_online_order public.online_orders;
begin
  select * into v_online_order
    from public.online_orders
   where id = p_online_order_id
   for update;

  if not found or not public.is_member(v_online_order.organization_id) then
    raise exception 'online order not found' using errcode = 'P0002';
  end if;

  if v_online_order.status <> 'pending' then
    raise exception 'online order already decided' using errcode = 'TB012';
  end if;

  update public.online_orders
     set status = 'rejected',
         decided_at = now(),
         decided_by = auth.uid()
   where id = v_online_order.id;
end;
$$;

revoke execute on function public.reject_online_order from public, anon;
grant execute on function public.reject_online_order to authenticated;

create function public.touch_pos_presence(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  update public.organizations
     set pos_seen_at = now()
   where id = p_organization_id
     and (pos_seen_at is null or pos_seen_at < now() - interval '30 seconds');
end;
$$;

revoke execute on function public.touch_pos_presence from public, anon;
grant execute on function public.touch_pos_presence to authenticated;
