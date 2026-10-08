create function public.save_ingredient_label_defaults(
  p_ingredient_id uuid,
  p_shelf_life_hours integer,
  p_storage public.storage_condition
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  select organization_id into v_organization_id
    from public.ingredients
   where id = p_ingredient_id;

  if v_organization_id is null or not public.is_member(v_organization_id) then
    raise exception 'ingredient not found' using errcode = 'P0002';
  end if;

  update public.ingredients
     set label_shelf_life_hours = p_shelf_life_hours,
         label_storage = p_storage
   where id = p_ingredient_id;
end;
$$;

revoke execute on function public.save_ingredient_label_defaults from public, anon;
grant execute on function public.save_ingredient_label_defaults to authenticated;
