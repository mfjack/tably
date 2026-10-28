alter table public.stock_entries
  add column financial_entry_id uuid references public.financial_entries (id) on delete set null,
  add column previous_unit_cost numeric(14, 6);

create index stock_entries_financial_entry_id_idx
  on public.stock_entries (financial_entry_id);

update public.stock_entries as stock_entry
   set financial_entry_id = entry.id
  from public.financial_entries as entry
 where entry.organization_id = stock_entry.organization_id
   and entry.source = 'stock_purchase'
   and entry.created_at = stock_entry.created_at
   and stock_entry.financial_entry_id is null;

create function public.capture_stock_entry_previous_cost()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select unit_cost into new.previous_unit_cost
    from public.ingredients
   where id = new.ingredient_id;

  return new;
end;
$$;

revoke execute on function public.capture_stock_entry_previous_cost from public, anon, authenticated;

create trigger stock_entries_capture_previous_cost
  before insert on public.stock_entries
  for each row execute function public.capture_stock_entry_previous_cost();

create function public.link_stock_purchase_entries()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source = 'stock_purchase' then
    update public.stock_entries
       set financial_entry_id = new.id
     where organization_id = new.organization_id
       and created_at = new.created_at
       and financial_entry_id is null;
  end if;

  return new;
end;
$$;

revoke execute on function public.link_stock_purchase_entries from public, anon, authenticated;

create trigger financial_entries_link_stock_purchase
  after insert on public.financial_entries
  for each row execute function public.link_stock_purchase_entries();

create function public.undo_stock_purchase(p_entry_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.financial_entries;
  v_ingredient_ids uuid[];
  v_undone integer;
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

  return v_undone;
end;
$$;

revoke execute on function public.undo_stock_purchase from public, anon;
grant execute on function public.undo_stock_purchase to authenticated;
