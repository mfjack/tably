create or replace function public.normalize_addon_ids(p_addon_ids jsonb)
returns uuid[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(addon_id::uuid order by addon_id::uuid), '{}'::uuid[])
    from jsonb_array_elements_text(
      case when jsonb_typeof(p_addon_ids) = 'array' then p_addon_ids else '[]'::jsonb end
    ) as addon_id;
$$;

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
    from unnest(p_addon_ids) as requested(addon_id)
    join public.product_addons as a on a.id = requested.addon_id
    join public.product_addon_links as l
      on l.addon_id = a.id
     and l.product_id = p_product_id
   where a.organization_id = p_organization_id
     and (a.is_active or p_allow_inactive);

  if v_count <> cardinality(p_addon_ids) then
    raise exception 'unavailable addon in order' using errcode = 'TB032';
  end if;

  return v_addons;
end;
$$;
