alter table public.organizations
  add column menu_ordering_mode text not null default 'everyone'
    check (menu_ordering_mode in ('everyone', 'team'));

alter table public.orders
  add column table_number integer check (table_number between 1 and 999);

create or replace function public.is_accepting_online_orders(p_organization public.organizations)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_organization.is_online_ordering_enabled
     and p_organization.menu_ordering_mode = 'everyone'
     and (public.get_opening_status(p_organization) ->> 'isOpen')::boolean
     and exists (
       select 1
         from public.cash_sessions as session
        where session.organization_id = p_organization.id
          and session.closed_at is null
     );
$$;

create or replace function public.build_table_customer_name(
  p_table_number integer,
  p_customer_name text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'Mesa ' || p_table_number
         || coalesce(' · ' || nullif(trim(p_customer_name), ''), '');
$$;

create or replace function public.place_waiter_order(
  p_organization_id uuid,
  p_table_number integer,
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
  v_customer_name text;
  v_order_id uuid;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  if p_table_number is null or p_table_number not between 1 and 999 then
    raise exception 'invalid table number' using errcode = '22023';
  end if;

  v_customer_name := public.build_table_customer_name(p_table_number, p_customer_name);

  perform pg_advisory_xact_lock(
    hashtext(p_organization_id::text || ':' || lower(v_customer_name))
  );

  select id into v_order_id
    from public.orders
   where organization_id = p_organization_id
     and paid_at is null
     and status <> 'canceled'
     and lower(customer_name) = lower(v_customer_name)
   order by created_at desc
   limit 1;

  if v_order_id is not null then
    perform public.add_order_items(v_order_id, p_items, p_note);
    return v_order_id;
  end if;

  select placed.order_id into v_order_id
    from public.place_order(
      p_organization_id => p_organization_id,
      p_items => p_items,
      p_note => p_note,
      p_customer_name => v_customer_name,
      p_send_to_kitchen => true
    ) as placed;

  update public.orders
     set table_number = p_table_number
   where id = v_order_id;

  return v_order_id;
end;
$$;

revoke execute on function public.place_waiter_order from public, anon;
grant execute on function public.place_waiter_order to authenticated;

create or replace function public.set_order_table(
  p_order_id uuid,
  p_table_number integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_guest_name text;
  v_customer_name text;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if not found or not public.is_member(v_order.organization_id) then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.paid_at is not null or v_order.status = 'canceled' then
    raise exception 'order is closed' using errcode = 'TB003';
  end if;

  if p_table_number is null or p_table_number not between 1 and 999 then
    raise exception 'invalid table number' using errcode = '22023';
  end if;

  v_guest_name := case
    when v_order.table_number is null then v_order.customer_name
    else nullif(substring(v_order.customer_name from '^Mesa [0-9]+ · (.*)$'), '')
  end;
  v_customer_name := public.build_table_customer_name(p_table_number, v_guest_name);

  if lower(v_customer_name) <> lower(coalesce(v_order.customer_name, ''))
     and public.is_customer_name_in_use(v_order.organization_id, v_customer_name) then
    raise exception 'customer name already in use' using errcode = 'TB002';
  end if;

  update public.orders
     set table_number = p_table_number,
         customer_name = v_customer_name
   where id = p_order_id;
end;
$$;

revoke execute on function public.set_order_table from public, anon;
grant execute on function public.set_order_table to authenticated;

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
    'isWaiterOrdering', o.is_online_ordering_enabled and o.menu_ordering_mode = 'team',
    'openingStatus', public.get_opening_status(o),
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
                  'description', p.menu_description,
                  'isDailyLuck', p.is_daily_luck,
                  'price', p.price,
                  'addons', case when o.is_product_addons_enabled then coalesce((
                    select jsonb_agg(
                      jsonb_build_object(
                        'id', a.id,
                        'name', a.name,
                        'price', a.price,
                        'isAvailable', a.ingredient_id is null or exists (
                          select 1
                            from public.ingredients as addon_ingredient
                           where addon_ingredient.id = a.ingredient_id
                             and addon_ingredient.current_stock >= a.ingredient_quantity
                        )
                      )
                      order by a.name
                    )
                      from public.product_addon_links as l
                      join public.product_addons as a on a.id = l.addon_id
                     where l.product_id = p.id
                       and a.is_active
                  ), '[]'::jsonb) else '[]'::jsonb end,
                  'isAvailable', coalesce(p.stock_quantity, 1) > 0 and not exists (
                    select 1
                      from public.product_ingredients as recipe
                      join public.ingredients as ingredient
                        on ingredient.id = recipe.ingredient_id
                     where recipe.product_id = p.id
                       and (ingredient.current_stock < recipe.quantity
                            or ingredient.expires_at < (now() at time zone o.timezone)::date)
                  ),
                  'remaining', least(
                    case when p.stock_quantity is not null then greatest(p.stock_quantity, 0) end,
                    (
                      select min(floor(greatest(ingredient.current_stock, 0) / recipe.quantity))::integer
                        from public.product_ingredients as recipe
                        join public.ingredients as ingredient
                          on ingredient.id = recipe.ingredient_id
                       where recipe.product_id = p.id
                    )
                  )
                )
                order by p.position nulls last, p.name
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
