create function public.register_purchase(
  p_organization_id uuid,
  p_items jsonb,
  p_payment_date date,
  p_freight_cost numeric default 0,
  p_supplier_id uuid default null
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subtotal numeric(12, 2);
  v_freight numeric(12, 2) := coalesce(p_freight_cost, 0);
  v_total numeric(12, 2);
  v_supplier_name text;
  v_today date;
begin
  if not public.is_member(p_organization_id)
     or not public.has_any_module_access(p_organization_id, '{ingredients}'::public.app_module[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_payment_date is null or v_freight < 0 then
    raise exception 'invalid purchase' using errcode = '22023';
  end if;

  if p_supplier_id is not null and not exists (
    select 1 from public.suppliers
     where id = p_supplier_id and organization_id = p_organization_id
  ) then
    raise exception 'supplier not found' using errcode = 'P0002';
  end if;

  drop table if exists purchase_items;

  create temporary table purchase_items on commit drop as
  select
    row_number() over () as position,
    (item ->> 'ingredient_id')::uuid as ingredient_id,
    (item ->> 'product_id')::uuid as product_id,
    coalesce((item ->> 'quantity')::numeric, 0) as quantity,
    coalesce((item ->> 'total_cost')::numeric, 0)::numeric(12, 2) as total_cost,
    nullif(item ->> 'expires_at', '')::date as expires_at,
    0::numeric(12, 2) as freight_share
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item;

  if not exists (select 1 from purchase_items) then
    raise exception 'nothing purchased' using errcode = '22023';
  end if;

  if exists (
    select 1 from purchase_items
     where quantity <= 0
        or total_cost <= 0
        or (ingredient_id is null) = (product_id is null)
        or (product_id is not null and quantity <> trunc(quantity))
  ) then
    raise exception 'invalid purchase item' using errcode = '22023';
  end if;

  if exists (
    select 1 from purchase_items as item
     where item.ingredient_id is not null
       and not exists (
         select 1 from public.ingredients as i
          where i.id = item.ingredient_id
            and i.organization_id = p_organization_id
            and not i.is_prepared
       )
  ) or exists (
    select 1 from purchase_items as item
     where item.product_id is not null
       and not exists (
         select 1 from public.products as p
          where p.id = item.product_id
            and p.organization_id = p_organization_id
            and p.stock_quantity is not null
       )
  ) then
    raise exception 'purchase item not found' using errcode = 'P0002';
  end if;

  select sum(total_cost) into v_subtotal from purchase_items;

  if v_freight > 0 then
    update purchase_items
       set freight_share = round(total_cost * v_freight / v_subtotal, 2)
     where position > 0;

    update purchase_items
       set freight_share = freight_share + (v_freight - (select sum(freight_share) from purchase_items))
     where position = (select position from purchase_items order by total_cost desc, position limit 1);
  end if;

  insert into public.stock_entries (
    organization_id, ingredient_id, supplier_id, quantity, total_cost, expires_at
  )
  select p_organization_id, ingredient_id, p_supplier_id, quantity,
         total_cost + freight_share, expires_at
    from purchase_items
   where ingredient_id is not null
   order by position;

  update public.products as p
     set stock_quantity = p.stock_quantity + purchased.quantity::integer
    from (
      select product_id, sum(quantity) as quantity
        from purchase_items
       where product_id is not null
       group by product_id
    ) as purchased
   where p.id = purchased.product_id
     and p.organization_id = p_organization_id;

  insert into public.product_stock_movements (organization_id, product_id, quantity)
  select p_organization_id, product_id, quantity::integer
    from purchase_items
   where product_id is not null
   order by position;

  v_total := v_subtotal + v_freight;
  v_today := public.organization_today(p_organization_id);
  select name into v_supplier_name from public.suppliers where id = p_supplier_id;

  insert into public.financial_entries (
    organization_id, kind, description, amount, due_date, category_id,
    supplier_id, account_id, source, source_key, source_date, paid_at, paid_amount
  )
  values (
    p_organization_id,
    'expense',
    'Compra' || coalesce(' · ' || v_supplier_name, ''),
    v_total,
    p_payment_date,
    (select id from public.financial_categories
      where organization_id = p_organization_id
        and kind = 'expense'
        and name = 'Insumos e mercadorias'
      limit 1),
    p_supplier_id,
    (select id from public.financial_accounts
      where organization_id = p_organization_id
        and not is_archived
      order by created_at
      limit 1),
    'stock_purchase',
    'purchase:' || gen_random_uuid(),
    v_today,
    case when p_payment_date <= v_today then p_payment_date end,
    case when p_payment_date <= v_today then v_total end
  );

  return v_total;
end;
$$;

revoke execute on function public.register_purchase from public, anon;
grant execute on function public.register_purchase to authenticated;
