drop function public.add_product_stock(uuid, integer);

create function public.add_product_stock(
  p_product_id uuid,
  p_quantity integer,
  p_total_cost numeric,
  p_payment_date date,
  p_minimum_stock integer default null,
  p_supplier_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_today date;
begin
  select * into v_product from public.products where id = p_product_id for update;

  if not found or not public.is_member(v_product.organization_id) then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  if v_product.stock_quantity is null then
    raise exception 'product stock is not tracked' using errcode = 'TB045';
  end if;

  if coalesce(p_quantity, 0) <= 0
     or coalesce(p_total_cost, 0) <= 0
     or p_payment_date is null
     or coalesce(p_minimum_stock, 0) < 0 then
    raise exception 'invalid product stock entry' using errcode = '22023';
  end if;

  v_today := public.organization_today(v_product.organization_id);

  update public.products
     set stock_quantity = stock_quantity + p_quantity,
         minimum_stock = coalesce(p_minimum_stock, minimum_stock)
   where id = p_product_id;

  insert into public.product_stock_movements (organization_id, product_id, quantity)
  values (v_product.organization_id, p_product_id, p_quantity);

  insert into public.financial_entries (
    organization_id, kind, description, amount, due_date, category_id,
    supplier_id, account_id, paid_at, paid_amount
  )
  values (
    v_product.organization_id,
    'expense',
    'Compra de ' || v_product.name,
    p_total_cost,
    p_payment_date,
    (select id from public.financial_categories
      where organization_id = v_product.organization_id
        and kind = 'expense'
        and name = 'Insumos e mercadorias'
      limit 1),
    p_supplier_id,
    (select id from public.financial_accounts
      where organization_id = v_product.organization_id
        and not is_archived
      order by created_at
      limit 1),
    case when p_payment_date <= v_today then p_payment_date end,
    case when p_payment_date <= v_today then p_total_cost end
  );

  return v_product.stock_quantity + p_quantity;
end;
$$;

revoke execute on function public.add_product_stock from public, anon;
grant execute on function public.add_product_stock to authenticated;
