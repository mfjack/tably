alter table public.ingredients
  add column preparation_instructions text check (char_length(preparation_instructions) <= 4000);

drop function public.save_prepared_recipe(uuid, boolean, numeric, jsonb);

create function public.save_prepared_recipe(
  p_ingredient_id uuid,
  p_is_prepared boolean,
  p_yield_quantity numeric,
  p_components jsonb,
  p_instructions text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingredient public.ingredients;
  v_theoretical_cost numeric;
begin
  select * into v_ingredient
    from public.ingredients
   where id = p_ingredient_id
     for update;

  if not found then
    raise exception 'ingredient not found' using errcode = 'P0002';
  end if;

  if not public.has_role(v_ingredient.organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed to change recipes' using errcode = '42501';
  end if;

  delete from public.ingredient_components
   where prepared_ingredient_id = p_ingredient_id;

  if not coalesce(p_is_prepared, false) then
    update public.ingredients
       set is_prepared = false,
           yield_quantity = null,
           preparation_instructions = null
     where id = p_ingredient_id;
    return;
  end if;

  if coalesce(p_yield_quantity, 0) <= 0 then
    raise exception 'invalid yield' using errcode = '22023';
  end if;

  insert into public.ingredient_components (
    prepared_ingredient_id, component_ingredient_id, organization_id, quantity
  )
  select p_ingredient_id, component.id, v_ingredient.organization_id, sum((item ->> 'quantity')::numeric)
    from jsonb_array_elements(coalesce(p_components, '[]'::jsonb)) as item
    join public.ingredients as component
      on component.id = (item ->> 'ingredient_id')::uuid
     and component.organization_id = v_ingredient.organization_id
   where (item ->> 'quantity')::numeric > 0
   group by component.id;

  if not exists (
    select 1 from public.ingredient_components
     where prepared_ingredient_id = p_ingredient_id
  ) then
    raise exception 'prepared ingredient needs components' using errcode = '22023';
  end if;

  if exists (
    with recursive chain (ingredient_id) as (
      select component_ingredient_id
        from public.ingredient_components
       where prepared_ingredient_id = p_ingredient_id
      union
      select ic.component_ingredient_id
        from public.ingredient_components as ic
        join chain on chain.ingredient_id = ic.prepared_ingredient_id
    )
    select 1 from chain where ingredient_id = p_ingredient_id
  ) then
    raise exception 'recipe cycle' using errcode = 'TB035';
  end if;

  select coalesce(sum(ic.quantity * component.unit_cost), 0) / p_yield_quantity
    into v_theoretical_cost
    from public.ingredient_components as ic
    join public.ingredients as component on component.id = ic.component_ingredient_id
   where ic.prepared_ingredient_id = p_ingredient_id;

  update public.ingredients
     set is_prepared = true,
         yield_quantity = p_yield_quantity,
         preparation_instructions = nullif(trim(p_instructions), ''),
         unit_cost = case when current_stock <= 0 then v_theoretical_cost else unit_cost end
   where id = p_ingredient_id;
end;
$$;

revoke execute on function public.save_prepared_recipe from public, anon;
grant execute on function public.save_prepared_recipe to authenticated;
