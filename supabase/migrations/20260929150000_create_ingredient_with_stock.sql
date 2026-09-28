create function public.create_ingredient(
  p_organization_id uuid,
  p_name text,
  p_unit public.measure_unit,
  p_minimum_stock numeric,
  p_unit_cost numeric,
  p_initial_stock numeric
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ingredient_id uuid;
begin
  insert into public.ingredients (organization_id, name, unit, minimum_stock, unit_cost)
  values (p_organization_id, trim(p_name), p_unit, p_minimum_stock, p_unit_cost)
  returning id into v_ingredient_id;

  if p_initial_stock > 0 then
    insert into public.stock_entries (organization_id, ingredient_id, quantity, total_cost)
    values (
      p_organization_id,
      v_ingredient_id,
      p_initial_stock,
      round(p_initial_stock * p_unit_cost, 2)
    );
  end if;

  return v_ingredient_id;
end;
$$;

revoke execute on function public.create_ingredient from public, anon;
grant execute on function public.create_ingredient to authenticated;
