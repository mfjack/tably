CREATE OR REPLACE FUNCTION public.get_public_menu(p_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
                  'price', p.price,
                  'addons', case when o.is_product_addons_enabled then coalesce((
                    select jsonb_agg(
                      jsonb_build_object('id', a.id, 'name', a.name, 'price', a.price)
                      order by a.name
                    )
                      from public.product_addon_links as l
                      join public.product_addons as a on a.id = l.addon_id
                     where l.product_id = p.id
                       and a.is_active
                  ), '[]'::jsonb) else '[]'::jsonb end,
                  'isAvailable', not exists (
                    select 1
                      from public.product_ingredients as recipe
                      join public.ingredients as ingredient
                        on ingredient.id = recipe.ingredient_id
                     where recipe.product_id = p.id
                       and ingredient.current_stock < recipe.quantity
                  ),
                  'remaining', (
                    select min(floor(greatest(ingredient.current_stock, 0) / recipe.quantity))::integer
                      from public.product_ingredients as recipe
                      join public.ingredients as ingredient
                        on ingredient.id = recipe.ingredient_id
                     where recipe.product_id = p.id
                  )
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
             and c.is_on_menu
           group by c.id
        ) as section
    ), '[]'::jsonb)
  )
    from public.organizations as o
   where o.slug = p_slug
     and o.is_menu_published;
$function$;

CREATE OR REPLACE FUNCTION public.place_online_order(p_slug text, p_online_order_id uuid, p_device_id uuid, p_customer_name text, p_items jsonb, p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  if public.is_customer_name_in_use(v_organization.id, v_customer_name)
     or exists (
       select 1 from public.online_orders
        where organization_id = v_organization.id
          and status = 'pending'
          and lower(customer_name) = lower(v_customer_name)
     ) then
    raise exception 'customer name already in use' using errcode = 'TB013';
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
    public.normalize_addon_ids(item -> 'addon_ids') as addon_ids,
    sum((item ->> 'quantity')::integer) as quantity
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  group by 1, 2, 3;

  alter table requested_online_items
    add column addons jsonb,
    add column addons_price numeric(12, 2);

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

  update requested_online_items
     set addons = public.resolve_item_addons(v_organization.id, product_id, addon_ids, false)
   where true;

  update requested_online_items
     set addons_price = public.get_addons_total(addons)
   where true;

  select
    count(*),
    coalesce(sum((p.price + requested.addons_price) * requested.quantity), 0),
    jsonb_agg(
      jsonb_build_object(
        'product_id', p.id,
        'name', p.name,
        'quantity', requested.quantity,
        'unit_price', p.price + requested.addons_price,
        'note', requested.note,
        'addon_ids', to_jsonb(requested.addon_ids),
        'addons', requested.addons
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
     and c.is_on_menu;

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
$function$;

CREATE OR REPLACE FUNCTION public.accept_online_order(p_online_order_id uuid)
 RETURNS TABLE(order_id uuid, customer_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
            'note', item ->> 'note',
            'addon_ids', coalesce(item -> 'addon_ids', '[]'::jsonb)
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
$function$;
