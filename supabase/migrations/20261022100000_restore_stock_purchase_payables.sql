create function public.create_stock_purchase_payable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingredient_name text;
  v_category_id uuid;
  v_account_id uuid;
  v_timezone text;
begin
  if new.payment_due_date is null or new.total_cost <= 0 then
    return new;
  end if;

  select name into v_ingredient_name from public.ingredients where id = new.ingredient_id;
  select timezone into v_timezone from public.organizations where id = new.organization_id;

  select id into v_category_id
    from public.financial_categories
   where organization_id = new.organization_id
     and kind = 'expense'
     and name = 'Insumos e mercadorias'
   limit 1;

  select id into v_account_id
    from public.financial_accounts
   where organization_id = new.organization_id
     and not is_archived
   order by created_at
   limit 1;

  insert into public.financial_entries (
    organization_id, kind, description, amount, due_date, category_id,
    supplier_id, account_id, source, source_key, source_date
  )
  values (
    new.organization_id,
    'expense',
    'Compra de ' || v_ingredient_name,
    new.total_cost,
    new.payment_due_date,
    v_category_id,
    new.supplier_id,
    v_account_id,
    'stock_purchase',
    'stock:' || new.id,
    (new.entered_at at time zone coalesce(v_timezone, 'America/Sao_Paulo'))::date
  );

  return new;
end;
$$;

revoke execute on function public.create_stock_purchase_payable from public, anon, authenticated;

create trigger stock_entries_create_payable
  after insert on public.stock_entries
  for each row execute function public.create_stock_purchase_payable();

create function public.delete_stock_purchase_payable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.financial_entries
   where organization_id = old.organization_id
     and source = 'stock_purchase'
     and source_key = 'stock:' || old.id
     and paid_at is null;

  return old;
end;
$$;

revoke execute on function public.delete_stock_purchase_payable from public, anon, authenticated;

create trigger stock_entries_delete_payable
  after delete on public.stock_entries
  for each row execute function public.delete_stock_purchase_payable();

insert into public.financial_entries (
  organization_id, kind, description, amount, due_date, category_id,
  supplier_id, account_id, source, source_key, source_date
)
select
  stock_entry.organization_id,
  'expense',
  'Compra de ' || ingredient.name,
  stock_entry.total_cost,
  stock_entry.payment_due_date,
  (
    select category.id
      from public.financial_categories as category
     where category.organization_id = stock_entry.organization_id
       and category.kind = 'expense'
       and category.name = 'Insumos e mercadorias'
     limit 1
  ),
  stock_entry.supplier_id,
  (
    select account.id
      from public.financial_accounts as account
     where account.organization_id = stock_entry.organization_id
       and not account.is_archived
     order by account.created_at
     limit 1
  ),
  'stock_purchase',
  'stock:' || stock_entry.id,
  (stock_entry.entered_at at time zone coalesce(organization.timezone, 'America/Sao_Paulo'))::date
from public.stock_entries as stock_entry
join public.ingredients as ingredient on ingredient.id = stock_entry.ingredient_id
join public.organizations as organization on organization.id = stock_entry.organization_id
where stock_entry.payment_due_date is not null
  and stock_entry.total_cost > 0
  and not exists (
    select 1
      from public.financial_entries as entry
     where entry.organization_id = stock_entry.organization_id
       and entry.source_key = 'stock:' || stock_entry.id
  );
