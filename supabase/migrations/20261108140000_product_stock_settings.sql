CREATE OR REPLACE FUNCTION public.save_product(p_organization_id uuid, p_name text, p_price numeric, p_is_active boolean, p_recipe jsonb, p_addon_ids uuid[], p_is_on_menu boolean, p_product_id uuid DEFAULT NULL::uuid, p_category_id uuid DEFAULT NULL::uuid, p_image_url text DEFAULT NULL::text, p_menu_detail text DEFAULT NULL::text, p_stock_quantity integer DEFAULT NULL::integer, p_minimum_stock integer DEFAULT NULL::integer, p_supplier_id uuid DEFAULT NULL::uuid, p_initial_total_cost numeric DEFAULT NULL::numeric, p_initial_payment_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_product_id uuid;
  v_is_purchasing_initial_stock boolean :=
    p_product_id is null and p_stock_quantity is not null and p_initial_total_cost is not null;
begin
  if p_product_id is null then
    insert into public.products (
      organization_id, name, category_id, price, image_url, is_active,
      is_on_menu, menu_detail, stock_quantity, minimum_stock, supplier_id
    )
    values (
      p_organization_id, trim(p_name), p_category_id, p_price, p_image_url, p_is_active,
      p_is_on_menu, nullif(trim(p_menu_detail), ''),
      case when v_is_purchasing_initial_stock then 0 else p_stock_quantity end,
      coalesce(p_minimum_stock, 0), p_supplier_id
    )
    returning id into v_product_id;
  else
    update public.products
       set name = trim(p_name),
           category_id = p_category_id,
           price = p_price,
           image_url = p_image_url,
           is_active = p_is_active,
           is_on_menu = p_is_on_menu,
           menu_detail = nullif(trim(p_menu_detail), '')
     where id = p_product_id
       and organization_id = p_organization_id
    returning id into v_product_id;

    if v_product_id is null then
      raise exception 'product not found' using errcode = 'P0002';
    end if;

    delete from public.product_ingredients where product_id = v_product_id;
  end if;

  insert into public.product_ingredients (product_id, ingredient_id, organization_id, quantity)
  select
    v_product_id,
    (recipe_item ->> 'ingredient_id')::uuid,
    p_organization_id,
    (recipe_item ->> 'quantity')::numeric
  from jsonb_array_elements(coalesce(p_recipe, '[]'::jsonb)) as recipe_item;

  perform public.set_product_addons(v_product_id, p_addon_ids);

  if v_is_purchasing_initial_stock then
    perform public.add_product_stock(
      v_product_id,
      p_stock_quantity,
      p_initial_total_cost,
      p_initial_payment_date,
      null,
      p_supplier_id
    );
  end if;

  return v_product_id;
end;
$function$;

create or replace function public.update_product_stock_settings(
  p_product_id uuid,
  p_is_stock_tracked boolean,
  p_minimum_stock integer,
  p_supplier_id uuid default null,
  p_quantity integer default null,
  p_total_cost numeric default null,
  p_payment_date date default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
begin
  select * into v_product
    from public.products
   where id = p_product_id
   for update;

  if not found or not public.is_member(v_product.organization_id) then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  if coalesce(p_minimum_stock, 0) < 0
     or coalesce(p_quantity, 0) < 0
     or (coalesce(p_total_cost, 0) > 0 and coalesce(p_quantity, 0) = 0)
     or (coalesce(p_quantity, 0) > 0 and not p_is_stock_tracked) then
    raise exception 'invalid product stock entry' using errcode = '22023';
  end if;

  if p_supplier_id is not null and not exists (
    select 1 from public.suppliers
     where id = p_supplier_id and organization_id = v_product.organization_id
  ) then
    raise exception 'supplier not found' using errcode = 'P0002';
  end if;

  update public.products
     set stock_quantity = case
           when p_is_stock_tracked then coalesce(stock_quantity, 0)
         end,
         minimum_stock = case
           when p_is_stock_tracked then coalesce(p_minimum_stock, 0)
           else 0
         end,
         supplier_id = case when p_is_stock_tracked then p_supplier_id end
   where id = p_product_id;

  if coalesce(p_quantity, 0) > 0 then
    return public.add_product_stock(
      p_product_id,
      p_quantity,
      coalesce(p_total_cost, 0),
      p_payment_date,
      p_minimum_stock,
      p_supplier_id
    );
  end if;

  return case when p_is_stock_tracked then coalesce(v_product.stock_quantity, 0) end;
end;
$$;

revoke execute on function public.update_product_stock_settings from public, anon;
grant execute on function public.update_product_stock_settings to authenticated;
