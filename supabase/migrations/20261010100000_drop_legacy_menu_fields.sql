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

alter table public.categories
  drop column menu_group,
  drop column menu_is_highlighted;
