alter table public.organizations
  add column is_menu_published boolean not null default false,
  add column menu_tagline text check (char_length(menu_tagline) <= 60),
  add column menu_instagram text check (char_length(menu_instagram) <= 40),
  add column menu_note text check (char_length(menu_note) <= 120);

alter table public.categories
  add column menu_group text check (menu_group in ('drinks', 'food')),
  add column menu_is_highlighted boolean not null default false;

alter table public.products
  add column is_on_menu boolean not null default true,
  add column menu_detail text check (char_length(menu_detail) <= 40);

create function public.get_public_menu(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', o.name,
    'tagline', o.menu_tagline,
    'instagram', o.menu_instagram,
    'note', o.menu_note,
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

revoke execute on function public.get_public_menu from public;
grant execute on function public.get_public_menu to anon, authenticated;
