create function public.delete_preparation(p_ingredient_id uuid)
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

  delete from public.product_ingredients
   where ingredient_id = p_ingredient_id;

  delete from public.ingredient_components
   where component_ingredient_id = p_ingredient_id;

  update public.product_addons
     set ingredient_id = null,
         ingredient_quantity = null
   where ingredient_id = p_ingredient_id;

  delete from public.ingredients
   where id = p_ingredient_id;
end;
$$;

revoke execute on function public.delete_preparation from public, anon;
grant execute on function public.delete_preparation to authenticated;
