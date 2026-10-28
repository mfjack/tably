create or replace function public.undo_stock_purchase(p_entry_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.financial_entries;
  v_ingredient_ids uuid[];
  v_undone integer;
  v_invoice_key text;
begin
  select * into v_entry
    from public.financial_entries
   where id = p_entry_id
     for update;

  if not found or v_entry.source <> 'stock_purchase' then
    raise exception 'purchase not found' using errcode = 'P0002';
  end if;

  if v_entry.source_key like 'purchase-order:%' then
    raise exception 'purchase order cannot be undone' using errcode = 'TB049';
  end if;

  if not public.has_role(v_entry.organization_id, array['owner', 'manager']::public.member_role[])
     or not public.has_any_module_access(v_entry.organization_id, '{finance}'::public.app_module[])
     or not public.has_any_module_access(v_entry.organization_id, '{ingredients}'::public.app_module[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select array_agg(distinct ingredient_id), count(*)
    into v_ingredient_ids, v_undone
    from public.stock_entries
   where financial_entry_id = p_entry_id;

  if v_undone = 0 then
    raise exception 'nothing to undo' using errcode = 'TB048';
  end if;

  perform 1
     from public.ingredients
    where id = any(v_ingredient_ids)
      for update;

  update public.ingredients as ingredient
     set current_stock = ingredient.current_stock - purchased.quantity,
         unit_cost = case
           when purchased.previous_unit_cost is not null
            and not exists (
              select 1 from public.stock_entries as later
               where later.ingredient_id = ingredient.id
                 and later.created_at > purchased.created_at
                 and later.financial_entry_id is distinct from p_entry_id
            )
            and not exists (
              select 1 from public.production_batches as batch
               where batch.ingredient_id = ingredient.id
                 and batch.produced_at > purchased.created_at
            )
           then purchased.previous_unit_cost
           else ingredient.unit_cost
         end
    from (
      select ingredient_id,
             sum(quantity) as quantity,
             min(created_at) as created_at,
             (array_agg(previous_unit_cost order by created_at, id))[1] as previous_unit_cost
        from public.stock_entries
       where financial_entry_id = p_entry_id
       group by ingredient_id
    ) as purchased
   where ingredient.id = purchased.ingredient_id;

  delete from public.stock_entries
   where financial_entry_id = p_entry_id;

  delete from public.ingredients as ingredient
   where ingredient.id = any(v_ingredient_ids)
     and ingredient.organization_id = v_entry.organization_id
     and ingredient.created_at = v_entry.created_at
     and not exists (select 1 from public.stock_entries where ingredient_id = ingredient.id)
     and not exists (select 1 from public.product_ingredients where ingredient_id = ingredient.id)
     and not exists (select 1 from public.product_addons where ingredient_id = ingredient.id)
     and not exists (select 1 from public.ingredient_components where component_ingredient_id = ingredient.id)
     and not exists (select 1 from public.stock_movements where ingredient_id = ingredient.id)
     and not exists (select 1 from public.stock_losses where ingredient_id = ingredient.id);

  delete from public.financial_entries
   where id = p_entry_id;

  if v_entry.source_key like 'nfe:%' then
    v_invoice_key := split_part(v_entry.source_key, ':', 2);

    delete from public.financial_entries
     where organization_id = v_entry.organization_id
       and source = 'stock_purchase'
       and source_key like 'nfe:' || v_invoice_key || ':%';

    delete from public.purchase_invoices
     where organization_id = v_entry.organization_id
       and access_key = v_invoice_key;
  end if;

  return v_undone;
end;
$$;


drop trigger stock_entries_create_payable on public.stock_entries;

drop function public.create_stock_purchase_payable();
