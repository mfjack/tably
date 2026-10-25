drop function public.register_stock_loss(uuid, uuid, numeric, public.stock_loss_reason, text);

create function public.register_stock_loss(
  p_organization_id uuid,
  p_ingredient_id uuid,
  p_quantity numeric,
  p_reason public.stock_loss_reason,
  p_note text default null,
  p_total_value numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingredient public.ingredients;
  v_loss_id uuid;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  if coalesce(p_quantity, 0) <= 0 or coalesce(p_total_value, 0) < 0 then
    raise exception 'invalid loss quantity' using errcode = '22023';
  end if;

  select * into v_ingredient
    from public.ingredients
   where id = p_ingredient_id
     and organization_id = p_organization_id
     for update;

  if not found then
    raise exception 'ingredient not found' using errcode = 'P0002';
  end if;

  insert into public.stock_losses (
    organization_id, ingredient_id, quantity, reason, note, unit_cost,
    loss_date, created_by, created_by_name
  )
  values (
    p_organization_id,
    p_ingredient_id,
    p_quantity,
    p_reason,
    nullif(trim(p_note), ''),
    coalesce(p_total_value / p_quantity, v_ingredient.unit_cost),
    public.organization_today(p_organization_id),
    auth.uid(),
    coalesce(
      public.current_operator_name(p_organization_id),
      (select full_name from public.profiles where id = auth.uid())
    )
  )
  returning id into v_loss_id;

  update public.ingredients
     set current_stock = current_stock - p_quantity
   where id = p_ingredient_id;

  insert into public.stock_movements (organization_id, ingredient_id, quantity, stock_loss_id)
  values (p_organization_id, p_ingredient_id, -p_quantity, v_loss_id);

  return v_loss_id;
end;
$$;

revoke execute on function public.register_stock_loss from public, anon;
grant execute on function public.register_stock_loss to authenticated;

create function public.update_stock_loss(
  p_loss_id uuid,
  p_quantity numeric,
  p_reason public.stock_loss_reason,
  p_note text default null,
  p_total_value numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loss public.stock_losses;
  v_ingredient_cost numeric;
begin
  select * into v_loss from public.stock_losses where id = p_loss_id for update;

  if not found or not public.is_member(v_loss.organization_id) then
    raise exception 'stock loss not found' using errcode = 'P0002';
  end if;

  if coalesce(p_quantity, 0) <= 0 or coalesce(p_total_value, 0) < 0 then
    raise exception 'invalid loss quantity' using errcode = '22023';
  end if;

  select unit_cost into v_ingredient_cost
    from public.ingredients
   where id = v_loss.ingredient_id
     for update;

  update public.ingredients
     set current_stock = current_stock - (p_quantity - v_loss.quantity)
   where id = v_loss.ingredient_id;

  update public.stock_movements
     set quantity = -p_quantity
   where stock_loss_id = p_loss_id;

  update public.stock_losses
     set quantity = p_quantity,
         reason = p_reason,
         note = nullif(trim(p_note), ''),
         unit_cost = coalesce(
           p_total_value / p_quantity,
           nullif(v_loss.unit_cost, 0),
           v_ingredient_cost,
           0
         )
   where id = p_loss_id;
end;
$$;

revoke execute on function public.update_stock_loss from public, anon;
grant execute on function public.update_stock_loss to authenticated;
