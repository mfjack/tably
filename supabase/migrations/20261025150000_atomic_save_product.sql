drop function public.save_product(uuid, text, numeric, boolean, jsonb, uuid, uuid, text);

create function public.save_product(
  p_organization_id uuid,
  p_name text,
  p_price numeric,
  p_is_active boolean,
  p_recipe jsonb,
  p_addon_ids uuid[],
  p_is_on_menu boolean,
  p_product_id uuid default null,
  p_category_id uuid default null,
  p_image_url text default null,
  p_menu_detail text default null,
  p_stock_quantity integer default null,
  p_minimum_stock integer default null,
  p_supplier_id uuid default null,
  p_initial_total_cost numeric default null,
  p_initial_payment_date date default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
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
           menu_detail = nullif(trim(p_menu_detail), ''),
           stock_quantity = p_stock_quantity,
           minimum_stock = coalesce(p_minimum_stock, 0),
           supplier_id = p_supplier_id
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
$$;

revoke execute on function public.save_product from public, anon;
grant execute on function public.save_product to authenticated;
