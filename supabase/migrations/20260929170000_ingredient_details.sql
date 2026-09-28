alter table public.ingredients
  add column brand text check (char_length(brand) <= 60),
  add column supplier_id uuid,
  add column expires_at date,
  add foreign key (supplier_id, organization_id)
    references public.suppliers (id, organization_id) on delete set null (supplier_id);

alter table public.stock_entries
  add column expires_at date;

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
     set unit_cost = (v_stock * v_cost + new.total_cost) / (v_stock + new.quantity),
         current_stock = current_stock + new.quantity,
         expires_at = coalesce(new.expires_at, expires_at)
   where id = new.ingredient_id;

  return new;
end;
$$;

drop function public.create_ingredient(uuid, text, public.measure_unit, numeric, numeric, numeric);

create function public.create_ingredient(
  p_organization_id uuid,
  p_name text,
  p_brand text,
  p_unit public.measure_unit,
  p_quantity numeric,
  p_total_cost numeric,
  p_minimum_stock numeric,
  p_supplier_id uuid,
  p_expires_at date
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
