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
              'id', c.id,
              'name', c.name,
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
           group by c.id
        ) as section
    ), '[]'::jsonb)
  )
    from public.organizations as o
   where o.slug = p_slug
     and o.is_menu_published;
$$;

create or replace function public.place_online_order(
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
      on c.id = p.category_id;

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

alter table public.categories
  drop column menu_group,
  drop column menu_is_highlighted;
