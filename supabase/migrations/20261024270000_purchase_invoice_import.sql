alter table public.suppliers
  add column tax_id text check (tax_id ~ '^([0-9]{11}|[0-9]{14})$');

create unique index suppliers_organization_tax_id_idx
  on public.suppliers (organization_id, tax_id)
  where tax_id is not null;

create table public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid not null,
  product_code text not null check (char_length(product_code) between 1 and 60),
  ingredient_id uuid not null,
  units_per_package numeric(14, 3) not null check (units_per_package > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, product_code),
  foreign key (supplier_id, organization_id)
    references public.suppliers (id, organization_id) on delete cascade,
  foreign key (ingredient_id, organization_id)
    references public.ingredients (id, organization_id) on delete cascade
);

create table public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid,
  access_key text not null check (access_key ~ '^[0-9]{44}$'),
  number text,
  issued_at timestamptz,
  total_amount numeric(12, 2) not null default 0,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (organization_id, access_key),
  foreign key (supplier_id, organization_id)
    references public.suppliers (id, organization_id) on delete set null (supplier_id)
);

do $$
declare
  v_table text;
begin
  foreach v_table in array array['supplier_products', 'purchase_invoices'] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format(
      'create policy "%1$s: members read" on public.%1$I for select to authenticated
         using (public.is_member(organization_id))',
      v_table
    );
    execute format(
      'create policy "%1$s: managers insert" on public.%1$I for insert to authenticated
         with check (public.has_role(organization_id, array[''owner'', ''manager'']::public.member_role[]))',
      v_table
    );
    execute format(
      'create policy "%1$s: managers update" on public.%1$I for update to authenticated
         using (public.has_role(organization_id, array[''owner'', ''manager'']::public.member_role[]))
         with check (public.has_role(organization_id, array[''owner'', ''manager'']::public.member_role[]))',
      v_table
    );
    execute format(
      'create policy "%1$s: managers delete" on public.%1$I for delete to authenticated
         using (public.has_role(organization_id, array[''owner'', ''manager'']::public.member_role[]))',
      v_table
    );
  end loop;
end;
$$;

create trigger supplier_products_updated_at
  before update on public.supplier_products
  for each row execute function public.set_updated_at();

create function public.import_purchase_invoice(p_organization_id uuid, p_invoice jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_supplier jsonb := p_invoice -> 'supplier';
  v_supplier_id uuid;
  v_item jsonb;
  v_ingredient_id uuid;
  v_installment jsonb;
  v_installment_count integer := coalesce(jsonb_array_length(p_invoice -> 'installments'), 0);
  v_position integer := 0;
  v_category_id uuid;
  v_account_id uuid;
  v_invoice_id uuid;
  v_access_key text := p_invoice ->> 'accessKey';
  v_issued_date date := (p_invoice ->> 'issuedDate')::date;
  v_description text;
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.purchase_invoices
     where organization_id = p_organization_id and access_key = v_access_key
  ) then
    raise exception 'invoice already imported' using errcode = 'TB030';
  end if;

  select id into v_supplier_id
    from public.suppliers
   where organization_id = p_organization_id
     and tax_id = v_supplier ->> 'taxId';

  if v_supplier_id is null then
    select id into v_supplier_id
      from public.suppliers
     where organization_id = p_organization_id
       and lower(trim(name)) = lower(trim(v_supplier ->> 'name'))
     limit 1;

    if v_supplier_id is null then
      insert into public.suppliers (organization_id, name, phone, tax_id)
      values (
        p_organization_id,
        left(trim(v_supplier ->> 'name'), 100),
        nullif(v_supplier ->> 'phone', ''),
        v_supplier ->> 'taxId'
      )
      returning id into v_supplier_id;
    else
      update public.suppliers
         set tax_id = coalesce(tax_id, v_supplier ->> 'taxId')
       where id = v_supplier_id;
    end if;
  end if;

  for v_item in select value from jsonb_array_elements(p_invoice -> 'items') loop
    if v_item ->> 'action' = 'skip' then
      continue;
    end if;

    if v_item ->> 'action' = 'create' then
      insert into public.ingredients (organization_id, name, unit, supplier_id)
      values (
        p_organization_id,
        left(trim(v_item -> 'newIngredient' ->> 'name'), 80),
        (v_item -> 'newIngredient' ->> 'unit')::public.measure_unit,
        v_supplier_id
      )
      returning id into v_ingredient_id;
    else
      v_ingredient_id := (v_item ->> 'ingredientId')::uuid;
    end if;

    insert into public.supplier_products (
      organization_id, supplier_id, product_code, ingredient_id, units_per_package
    )
    values (
      p_organization_id,
      v_supplier_id,
      v_item ->> 'productCode',
      v_ingredient_id,
      (v_item ->> 'unitsPerPackage')::numeric
    )
    on conflict (supplier_id, product_code) do update
      set ingredient_id = excluded.ingredient_id,
          units_per_package = excluded.units_per_package;

    insert into public.stock_entries (
      organization_id, ingredient_id, supplier_id, quantity, total_cost
    )
    values (
      p_organization_id,
      v_ingredient_id,
      v_supplier_id,
      (v_item ->> 'packages')::numeric * (v_item ->> 'unitsPerPackage')::numeric,
      (v_item ->> 'totalCost')::numeric
    );
  end loop;

  select id into v_category_id
    from public.financial_categories
   where organization_id = p_organization_id
     and kind = 'expense'
     and name = 'Insumos e mercadorias'
   limit 1;

  select id into v_account_id
    from public.financial_accounts
   where organization_id = p_organization_id
     and not is_archived
   order by created_at
   limit 1;

  v_description := 'Nota ' || coalesce(p_invoice ->> 'number', '') || ' · '
    || coalesce(v_supplier ->> 'name', 'fornecedor');

  if v_installment_count = 0 then
    insert into public.financial_entries (
      organization_id, kind, description, amount, due_date, category_id,
      supplier_id, account_id, source, source_key, source_date
    )
    values (
      p_organization_id, 'expense', v_description,
      (p_invoice ->> 'totalAmount')::numeric, v_issued_date, v_category_id,
      v_supplier_id, v_account_id, 'stock_purchase',
      'nfe:' || v_access_key || ':1', v_issued_date
    );
  else
    for v_installment in select value from jsonb_array_elements(p_invoice -> 'installments') loop
      v_position := v_position + 1;
      insert into public.financial_entries (
        organization_id, kind, description, amount, due_date, category_id,
        supplier_id, account_id, source, source_key, source_date
      )
      values (
        p_organization_id,
        'expense',
        v_description || case
          when v_installment_count > 1 then ' (' || v_position || '/' || v_installment_count || ')'
          else ''
        end,
        (v_installment ->> 'amount')::numeric,
        (v_installment ->> 'dueDate')::date,
        v_category_id,
        v_supplier_id,
        v_account_id,
        'stock_purchase',
        'nfe:' || v_access_key || ':' || v_position,
        v_issued_date
      );
    end loop;
  end if;

  insert into public.purchase_invoices (
    organization_id, supplier_id, access_key, number, issued_at, total_amount
  )
  values (
    p_organization_id,
    v_supplier_id,
    v_access_key,
    p_invoice ->> 'number',
    (p_invoice ->> 'issuedAt')::timestamptz,
    (p_invoice ->> 'totalAmount')::numeric
  )
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;

revoke execute on function public.import_purchase_invoice from public, anon;
grant execute on function public.import_purchase_invoice to authenticated;
