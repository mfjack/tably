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
