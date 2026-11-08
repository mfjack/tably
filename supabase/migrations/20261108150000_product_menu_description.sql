alter table public.products
  add column menu_description text check (char_length(menu_description) <= 200);

drop function public.save_product(uuid, text, numeric, boolean, jsonb, uuid[], boolean, uuid, uuid, text, text, integer, integer, uuid, numeric, date);

CREATE OR REPLACE FUNCTION public.save_product(p_organization_id uuid, p_name text, p_price numeric, p_is_active boolean, p_recipe jsonb, p_addon_ids uuid[], p_is_on_menu boolean, p_product_id uuid DEFAULT NULL::uuid, p_category_id uuid DEFAULT NULL::uuid, p_image_url text DEFAULT NULL::text, p_menu_detail text DEFAULT NULL::text, p_stock_quantity integer DEFAULT NULL::integer, p_minimum_stock integer DEFAULT NULL::integer, p_supplier_id uuid DEFAULT NULL::uuid, p_initial_total_cost numeric DEFAULT NULL::numeric, p_initial_payment_date date DEFAULT NULL::date, p_menu_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_product_id uuid;
  v_is_purchasing_initial_stock boolean :=
    p_product_id is null and p_stock_quantity is not null and p_initial_total_cost is not null;
begin
  if p_product_id is null then
    insert into public.products (
      organization_id, name, category_id, price, image_url, is_active,
      is_on_menu, menu_detail, menu_description, stock_quantity, minimum_stock, supplier_id
    )
    values (
      p_organization_id, trim(p_name), p_category_id, p_price, p_image_url, p_is_active,
      p_is_on_menu, nullif(trim(p_menu_detail), ''), nullif(trim(p_menu_description), ''),
      case when v_is_purchasing_initial_stock then 0 else p_stock_quantity end,
      coalesce(p_minimum_stock, 0), p_supplier_id
    )
    returning id into v_product_id;
  else
    update public.products
       set name = trim(p_name),
           category_id = p_category_id,
           price = p_price,
           image_url = p_image_url,
           is_active = p_is_active,
           is_on_menu = p_is_on_menu,
           menu_detail = nullif(trim(p_menu_detail), ''),
           menu_description = nullif(trim(p_menu_description), '')
     where id = p_product_id
       and organization_id = p_organization_id
    returning id into v_product_id;

    if v_product_id is null then
      raise exception 'product not found' using errcode = 'P0002';
    end if;

    delete from public.product_ingredients where product_id = v_product_id;
  end if;

  insert into public.product_ingredients (product_id, ingredient_id, organization_id, quantity)
  select
    v_product_id,
    (recipe_item ->> 'ingredient_id')::uuid,
    p_organization_id,
    (recipe_item ->> 'quantity')::numeric
  from jsonb_array_elements(coalesce(p_recipe, '[]'::jsonb)) as recipe_item;

  perform public.set_product_addons(v_product_id, p_addon_ids);

  if v_is_purchasing_initial_stock then
    perform public.add_product_stock(
      v_product_id,
      p_stock_quantity,
      p_initial_total_cost,
      p_initial_payment_date,
      null,
      p_supplier_id
    );
  end if;

  return v_product_id;
end;
$function$;

revoke execute on function public.save_product from public, anon;
grant execute on function public.save_product to authenticated;

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
