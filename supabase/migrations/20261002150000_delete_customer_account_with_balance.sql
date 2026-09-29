create or replace function public.delete_customer_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.customer_accounts;
begin
  select * into v_account
    from public.customer_accounts
   where id = p_account_id
     and archived_at is null
   for update;

  if not found or not public.is_member(v_account.organization_id) then
    raise exception 'customer account not found' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.account_entries where account_id = p_account_id) then
    delete from public.customer_accounts where id = p_account_id;
    return;
  end if;

  update public.customer_accounts
     set archived_at = now(),
         is_active = false
   where id = p_account_id;
end;
$$;
