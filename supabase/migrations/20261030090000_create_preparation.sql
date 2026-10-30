create function public.create_preparation(
  p_organization_id uuid,
  p_name text,
  p_unit public.measure_unit,
  p_yield_quantity numeric,
  p_components jsonb,
  p_instructions text default null,
  p_minimum_stock numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingredient_id uuid;
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[])
     or not public.has_any_module_access(p_organization_id, '{ingredients}'::public.app_module[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if coalesce(trim(p_name), '') = '' or coalesce(p_minimum_stock, 0) < 0 then
    raise exception 'invalid preparation' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.ingredients
     where organization_id = p_organization_id
       and lower(name) = lower(trim(p_name))
  ) then
    raise exception '%', trim(p_name) using errcode = 'TB047';
  end if;

  insert into public.ingredients (organization_id, name, unit, minimum_stock)
  values (p_organization_id, trim(p_name), p_unit, coalesce(p_minimum_stock, 0))
  returning id into v_ingredient_id;

  perform public.save_prepared_recipe(
    v_ingredient_id, true, p_yield_quantity, p_components, p_instructions
  );

  return v_ingredient_id;
end;
$$;

revoke execute on function public.create_preparation from public, anon;
grant execute on function public.create_preparation to authenticated;
