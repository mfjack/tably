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

delete from public.financial_entries as fe
 where fe.source = 'stock_purchase'
   and fe.paid_at is null
   and not exists (
     select 1 from public.stock_entries as se
      where 'stock:' || se.id = fe.source_key
   );
