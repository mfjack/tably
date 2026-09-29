alter table public.customer_accounts
  add column archived_at timestamptz;

drop index public.customer_accounts_organization_name_idx;

create unique index customer_accounts_organization_name_idx
  on public.customer_accounts (organization_id, lower(trim(name)))
  where archived_at is null;

create function public.delete_customer_account(p_account_id uuid)
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

  if public.get_account_balance(p_account_id) > 0 then
    raise exception 'customer account has balance' using errcode = 'TB007';
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

revoke execute on function public.delete_customer_account from public, anon;
grant execute on function public.delete_customer_account to authenticated;
