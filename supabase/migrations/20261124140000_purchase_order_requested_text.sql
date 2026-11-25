alter table public.purchase_order_items
  add column requested_text text,
  alter column quantity drop not null;

alter table public.purchase_order_items
  add constraint purchase_order_items_requested_check
  check (quantity is not null or requested_text is not null);

CREATE OR REPLACE FUNCTION public.create_purchase_order(p_organization_id uuid, p_items jsonb, p_supplier_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order_id uuid;
  v_ingredient_count integer;
  v_product_count integer;
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

  if exists (
    select 1 from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
     where item ->> 'product_id' is not null
       and (item ->> 'quantity')::numeric <> trunc((item ->> 'quantity')::numeric)
  ) then
    raise exception 'product quantity must be an integer' using errcode = '22023';
  end if;

  insert into public.purchase_orders (organization_id, supplier_id, created_by_name)
  values (p_organization_id, p_supplier_id, public.current_person_name(p_organization_id))
  returning id into v_order_id;

  insert into public.purchase_order_items (order_id, ingredient_id, organization_id, quantity, requested_text)
  select v_order_id, i.id, p_organization_id,
         sum((item ->> 'quantity')::numeric),
         string_agg(nullif(trim(item ->> 'requested_text'), ''), ' + ')
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
    join public.ingredients as i
      on i.id = (item ->> 'ingredient_id')::uuid
     and i.organization_id = p_organization_id
   where (item ->> 'quantity')::numeric > 0
      or nullif(trim(item ->> 'requested_text'), '') is not null
   group by i.id;

  get diagnostics v_ingredient_count = row_count;

  insert into public.purchase_order_items (order_id, product_id, organization_id, quantity, requested_text)
  select v_order_id, p.id, p_organization_id,
         sum((item ->> 'quantity')::numeric),
         string_agg(nullif(trim(item ->> 'requested_text'), ''), ' + ')
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
    join public.products as p
      on p.id = (item ->> 'product_id')::uuid
     and p.organization_id = p_organization_id
     and p.stock_quantity is not null
   where (item ->> 'quantity')::numeric > 0
      or nullif(trim(item ->> 'requested_text'), '') is not null
   group by p.id;

  get diagnostics v_product_count = row_count;

  if v_ingredient_count + v_product_count = 0 then
    raise exception 'purchase order has no items' using errcode = '22023';
  end if;

  return v_order_id;
end;
$function$;
