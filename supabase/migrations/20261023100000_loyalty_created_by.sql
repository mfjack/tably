create function public.stamp_loyalty_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_by_name := coalesce(
    new.created_by_name,
    public.current_operator_name(new.organization_id)
  );
  return new;
end;
$$;

revoke execute on function public.stamp_loyalty_transaction from public, anon, authenticated;

create trigger loyalty_transactions_stamp
  before insert on public.loyalty_transactions
  for each row execute function public.stamp_loyalty_transaction();
