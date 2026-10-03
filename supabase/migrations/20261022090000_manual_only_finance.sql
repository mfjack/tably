drop trigger if exists stock_entries_create_payable on public.stock_entries;
drop function if exists public.create_stock_purchase_payable();

drop trigger if exists stock_entries_delete_payable on public.stock_entries;
drop function if exists public.delete_stock_purchase_payable();

drop function if exists public.sync_financial_automations(uuid);
drop function if exists public.upsert_automatic_entry(
  uuid,
  public.financial_entry_source,
  text,
  date,
  public.financial_entry_kind,
  text,
  numeric,
  date,
  uuid,
  uuid,
  uuid,
  date,
  boolean
);

delete from public.financial_entries where source <> 'manual';
