create function public.update_preparation(
  p_ingredient_id uuid,
  p_name text,
  p_yield_quantity numeric,
  p_components jsonb,
  p_instructions text default null,
  p_minimum_stock numeric default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingredient public.ingredients;
begin
  select * into v_ingredient
    from public.ingredients
   where id = p_ingredient_id
     for update;

  if not found or not v_ingredient.is_prepared then
    raise exception 'preparation not found' using errcode = 'P0002';
  end if;

  if not public.has_role(v_ingredient.organization_id, array['owner', 'manager']::public.member_role[])
     or not public.has_any_module_access(v_ingredient.organization_id, '{ingredients}'::public.app_module[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if coalesce(trim(p_name), '') = '' or coalesce(p_minimum_stock, 0) < 0 then
    raise exception 'invalid preparation' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.ingredients
     where organization_id = v_ingredient.organization_id
       and id <> p_ingredient_id
       and lower(name) = lower(trim(p_name))
  ) then
    raise exception '%', trim(p_name) using errcode = 'TB047';
  end if;

  update public.ingredients
     set name = trim(p_name),
         minimum_stock = coalesce(p_minimum_stock, 0)
   where id = p_ingredient_id;

  perform public.save_prepared_recipe(
    p_ingredient_id, true, p_yield_quantity, p_components, p_instructions
  );
end;
$$;

revoke execute on function public.update_preparation from public, anon;
grant execute on function public.update_preparation to authenticated;
