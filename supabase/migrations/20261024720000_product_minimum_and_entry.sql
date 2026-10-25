alter table public.products
  add column minimum_stock integer not null default 0 check (minimum_stock >= 0);

create function public.add_product_stock(p_product_id uuid, p_quantity integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
begin
  select * into v_product from public.products where id = p_product_id for update;

  if not found or not public.is_member(v_product.organization_id) then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  if v_product.stock_quantity is null then
    raise exception 'product stock is not tracked' using errcode = 'TB045';
  end if;

  if coalesce(p_quantity, 0) <= 0 then
    raise exception 'invalid quantity' using errcode = '22023';
  end if;

  update public.products
     set stock_quantity = stock_quantity + p_quantity
   where id = p_product_id;

  insert into public.product_stock_movements (organization_id, product_id, quantity)
  values (v_product.organization_id, p_product_id, p_quantity);

  return v_product.stock_quantity + p_quantity;
end;
$$;

revoke execute on function public.add_product_stock from public, anon;
grant execute on function public.add_product_stock to authenticated;
