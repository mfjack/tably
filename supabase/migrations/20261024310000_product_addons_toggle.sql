alter table public.organizations
  add column is_product_addons_enabled boolean not null default false;

update public.organizations
   set is_product_addons_enabled = true
 where slug = 'tably';

create or replace function public.resolve_item_addons(
  p_organization_id uuid,
  p_product_id uuid,
  p_addon_ids uuid[],
  p_allow_inactive boolean
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_addons jsonb;
  v_count integer;
begin
  if coalesce(cardinality(p_addon_ids), 0) = 0 then
    return '[]'::jsonb;
  end if;

  if not exists (
    select 1 from public.organizations
     where id = p_organization_id and is_product_addons_enabled
  ) then
    raise exception 'product addons are disabled' using errcode = 'TB033';
  end if;

  select
    count(*),
    jsonb_agg(
      jsonb_build_object('addon_id', a.id, 'name', a.name, 'price', a.price)
      order by a.name
    )
    into v_count, v_addons
    from public.product_addons as a
    join public.product_addon_links as l
      on l.addon_id = a.id
     and l.product_id = p_product_id
   where a.id = any (p_addon_ids)
     and a.organization_id = p_organization_id
     and (a.is_active or p_allow_inactive);

  if v_count <> cardinality(p_addon_ids) then
    raise exception 'unavailable addon in order' using errcode = 'TB032';
  end if;

  return v_addons;
end;
$$;

