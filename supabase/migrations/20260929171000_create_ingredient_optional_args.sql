drop function public.create_ingredient(
  uuid, text, text, public.measure_unit, numeric, numeric, numeric, uuid, date
);

create function public.create_ingredient(
  p_organization_id uuid,
  p_name text,
  p_unit public.measure_unit,
  p_quantity numeric,
  p_total_cost numeric,
  p_minimum_stock numeric,
  p_brand text default null,
  p_supplier_id uuid default null,
  p_expires_at date default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ingredient_id uuid;
begin
  insert into public.ingredients (
    organization_id, name, brand, unit, minimum_stock, supplier_id, expires_at
  )
  values (
    p_organization_id, trim(p_name), nullif(trim(p_brand), ''), p_unit,
    p_minimum_stock, p_supplier_id, p_expires_at
  )
  returning id into v_ingredient_id;

  if p_quantity > 0 then
    insert into public.stock_entries (
      organization_id, ingredient_id, supplier_id, quantity, total_cost, expires_at
    )
    values (
      p_organization_id, v_ingredient_id, p_supplier_id, p_quantity, p_total_cost, p_expires_at
    );
  end if;

  return v_ingredient_id;
end;
$$;

revoke execute on function public.create_ingredient from public, anon;
grant execute on function public.create_ingredient to authenticated;
