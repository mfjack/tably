drop function public.create_ingredients(uuid, jsonb, date, uuid);

create function public.create_ingredients(
  p_organization_id uuid,
  p_ingredients jsonb,
  p_payment_date date,
  p_supplier_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric(12, 2);
  v_count integer;
  v_entry_id uuid;
  v_duplicate_name text;
  v_supplier_name text;
  v_today date;
begin
  if not public.is_member(p_organization_id)
     or not public.has_any_module_access(p_organization_id, '{ingredients}'::public.app_module[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_payment_date is null then
    raise exception 'invalid purchase' using errcode = '22023';
  end if;

  if p_supplier_id is not null and not exists (
    select 1 from public.suppliers
     where id = p_supplier_id and organization_id = p_organization_id
  ) then
    raise exception 'supplier not found' using errcode = 'P0002';
  end if;

  drop table if exists new_ingredients;

  create temporary table new_ingredients on commit drop as
  select
    row_number() over () as position,
    gen_random_uuid() as id,
    trim(item ->> 'name') as name,
    (item ->> 'unit')::public.measure_unit as unit,
    coalesce((item ->> 'quantity')::numeric, 0) as quantity,
    coalesce((item ->> 'total_cost')::numeric, 0)::numeric(12, 2) as total_cost,
    coalesce((item ->> 'minimum_stock')::numeric, 0) as minimum_stock,
    nullif(item ->> 'expires_at', '')::date as expires_at
  from jsonb_array_elements(coalesce(p_ingredients, '[]'::jsonb)) as item;

  select count(*) into v_count from new_ingredients;

  if v_count = 0 or exists (
    select 1 from new_ingredients
     where coalesce(name, '') = ''
        or unit is null
        or quantity <= 0
        or total_cost <= 0
        or minimum_stock < 0
  ) then
    raise exception 'invalid ingredient' using errcode = '22023';
  end if;

  select item.name into v_duplicate_name
    from new_ingredients as item
   where exists (
           select 1 from public.ingredients as i
            where i.organization_id = p_organization_id
              and lower(i.name) = lower(item.name)
         )
      or exists (
           select 1 from new_ingredients as other
            where other.position < item.position
              and lower(other.name) = lower(item.name)
         )
   order by item.position
   limit 1;

  if v_duplicate_name is not null then
    raise exception '%', v_duplicate_name using errcode = 'TB047';
  end if;

  insert into public.ingredients (
    id, organization_id, name, unit, minimum_stock, supplier_id, expires_at
  )
  select id, p_organization_id, name, unit, minimum_stock, p_supplier_id, expires_at
    from new_ingredients
   order by position;

  insert into public.stock_entries (
    organization_id, ingredient_id, supplier_id, quantity, total_cost, expires_at
  )
  select p_organization_id, id, p_supplier_id, quantity, total_cost, expires_at
    from new_ingredients
   order by position;

  select sum(total_cost) into v_total from new_ingredients;
  v_today := public.organization_today(p_organization_id);
  select name into v_supplier_name from public.suppliers where id = p_supplier_id;

  insert into public.financial_entries (
    organization_id, kind, description, amount, due_date, category_id,
    supplier_id, account_id, source, source_key, source_date, paid_at, paid_amount
  )
  values (
    p_organization_id,
    'expense',
    left(
      case
        when v_count = 1 then 'Compra de ' || (select name from new_ingredients limit 1)
        else 'Compra de ' || v_count || ' insumos' || coalesce(' · ' || v_supplier_name, '')
      end,
      120
    ),
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
    'ingredients:' || gen_random_uuid(),
    v_today,
    case when p_payment_date <= v_today then p_payment_date end,
    case when p_payment_date <= v_today then v_total end
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke execute on function public.create_ingredients from public, anon;
grant execute on function public.create_ingredients to authenticated;
