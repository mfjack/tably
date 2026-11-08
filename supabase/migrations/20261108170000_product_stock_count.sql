drop function public.update_product_stock_settings(uuid, boolean, integer, uuid, integer, numeric, date);

create or replace function public.update_product_stock_settings(
  p_product_id uuid,
  p_is_stock_tracked boolean,
  p_minimum_stock integer,
  p_supplier_id uuid default null,
  p_quantity integer default null,
  p_total_cost numeric default null,
  p_payment_date date default null,
  p_counted_quantity integer default null
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
     or coalesce(p_counted_quantity, 0) < 0
     or (p_counted_quantity is not null and not p_is_stock_tracked)
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

  if p_counted_quantity is not null
     and p_counted_quantity <> coalesce(v_product.stock_quantity, 0) then
    update public.products
       set stock_quantity = p_counted_quantity
     where id = p_product_id;

    insert into public.product_stock_movements (organization_id, product_id, quantity)
    values (
      v_product.organization_id,
      p_product_id,
      p_counted_quantity - coalesce(v_product.stock_quantity, 0)
    );
  end if;

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

  return case
    when p_is_stock_tracked then coalesce(p_counted_quantity, v_product.stock_quantity, 0)
  end;
end;
$$;

revoke execute on function public.update_product_stock_settings from public, anon;
grant execute on function public.update_product_stock_settings to authenticated;
