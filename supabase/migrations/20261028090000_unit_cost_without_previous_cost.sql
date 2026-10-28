create function public.blend_unit_cost(
  p_stock numeric,
  p_unit_cost numeric,
  p_added_quantity numeric,
  p_added_cost numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_unit_cost, 0) = 0 or greatest(p_stock, 0) = 0
      then p_added_cost / p_added_quantity
    else (greatest(p_stock, 0) * p_unit_cost + p_added_cost) / (greatest(p_stock, 0) + p_added_quantity)
  end;
$$;

revoke execute on function public.blend_unit_cost from public, anon;
grant execute on function public.blend_unit_cost to authenticated;

create or replace function public.apply_stock_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_stock numeric;
  v_cost numeric;
begin
  select greatest(current_stock, 0), unit_cost
    into v_stock, v_cost
    from public.ingredients
   where id = new.ingredient_id
     and organization_id = new.organization_id
     for update;

  if not found then
    raise exception 'ingredient does not belong to organization' using errcode = '23503';
  end if;

  update public.ingredients
     set unit_cost = public.blend_unit_cost(v_stock, v_cost, new.quantity, new.total_cost),
         current_stock = current_stock + new.quantity,
         expires_at = coalesce(new.expires_at, expires_at)
   where id = new.ingredient_id;

  return new;
end;
$$;

create or replace function public.register_production(
  p_ingredient_id uuid,
  p_batches numeric,
  p_produced_quantity numeric default null
)
returns table (batch_id uuid, produced_quantity numeric, total_cost numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingredient public.ingredients;
  v_expected numeric;
  v_produced numeric;
  v_total_cost numeric;
  v_batch_id uuid;
  v_stock numeric;
begin
  select * into v_ingredient
    from public.ingredients
   where id = p_ingredient_id
     for update;

  if not found or not public.is_member(v_ingredient.organization_id) then
    raise exception 'ingredient not found' using errcode = 'P0002';
  end if;

  if not v_ingredient.is_prepared then
    raise exception 'ingredient is not prepared' using errcode = 'TB036';
  end if;

  if coalesce(p_batches, 0) <= 0 then
    raise exception 'invalid batches' using errcode = '22023';
  end if;

  perform 1
     from public.ingredients as component
     join public.ingredient_components as ic on ic.component_ingredient_id = component.id
    where ic.prepared_ingredient_id = p_ingredient_id
      for update of component;

  v_expected := v_ingredient.yield_quantity * p_batches;
  v_produced := coalesce(p_produced_quantity, v_expected);

  if v_produced < 0 then
    raise exception 'invalid produced quantity' using errcode = '22023';
  end if;

  select coalesce(sum(ic.quantity * p_batches * component.unit_cost), 0)
    into v_total_cost
    from public.ingredient_components as ic
    join public.ingredients as component on component.id = ic.component_ingredient_id
   where ic.prepared_ingredient_id = p_ingredient_id;

  insert into public.production_batches (
    organization_id, ingredient_id, batches, expected_quantity, produced_quantity,
    total_cost, created_by_name
  )
  values (
    v_ingredient.organization_id, p_ingredient_id, p_batches, v_expected, v_produced,
    v_total_cost, public.current_person_name(v_ingredient.organization_id)
  )
  returning id into v_batch_id;

  update public.ingredients as component
     set current_stock = component.current_stock - ic.quantity * p_batches
    from public.ingredient_components as ic
   where ic.prepared_ingredient_id = p_ingredient_id
     and component.id = ic.component_ingredient_id;

  insert into public.stock_movements (organization_id, ingredient_id, quantity, production_batch_id)
  select v_ingredient.organization_id, ic.component_ingredient_id, -(ic.quantity * p_batches), v_batch_id
    from public.ingredient_components as ic
   where ic.prepared_ingredient_id = p_ingredient_id;

  if v_produced > 0 then
    v_stock := greatest(v_ingredient.current_stock, 0);

    update public.ingredients
       set unit_cost = public.blend_unit_cost(v_stock, v_ingredient.unit_cost, v_produced, v_total_cost),
           current_stock = current_stock + v_produced
     where id = p_ingredient_id;

    insert into public.stock_movements (organization_id, ingredient_id, quantity, production_batch_id)
    values (v_ingredient.organization_id, p_ingredient_id, v_produced, v_batch_id);
  end if;

  return query select v_batch_id, v_produced, v_total_cost;
end;
$$;

revoke execute on function public.register_production from public, anon;
grant execute on function public.register_production to authenticated;
