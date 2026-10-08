drop function public.create_purchase_order(uuid, uuid, jsonb);

create function public.create_purchase_order(
  p_organization_id uuid,
  p_items jsonb,
  p_supplier_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_item_count integer;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  if p_supplier_id is not null and not exists (
    select 1 from public.suppliers
     where id = p_supplier_id and organization_id = p_organization_id
  ) then
    raise exception 'supplier not found' using errcode = 'P0002';
  end if;

  insert into public.purchase_orders (organization_id, supplier_id, created_by_name)
  values (p_organization_id, p_supplier_id, public.current_person_name(p_organization_id))
  returning id into v_order_id;

  insert into public.purchase_order_items (order_id, ingredient_id, organization_id, quantity)
  select v_order_id, i.id, p_organization_id, sum((item ->> 'quantity')::numeric)
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
    join public.ingredients as i
      on i.id = (item ->> 'ingredient_id')::uuid
     and i.organization_id = p_organization_id
   where (item ->> 'quantity')::numeric > 0
   group by i.id;

  get diagnostics v_item_count = row_count;

  if v_item_count = 0 then
    raise exception 'purchase order has no items' using errcode = '22023';
  end if;

  return v_order_id;
end;
$$;

revoke execute on function public.create_purchase_order from public, anon;
grant execute on function public.create_purchase_order to authenticated;
