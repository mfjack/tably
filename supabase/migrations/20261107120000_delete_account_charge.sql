create or replace function public.delete_account_charge(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.account_entries;
begin
  select * into v_entry
    from public.account_entries
   where id = p_entry_id
     and kind = 'charge'
   for update;

  if not found or not public.is_member(v_entry.organization_id) then
    raise exception 'account entry not found' using errcode = 'P0002';
  end if;

  delete from public.account_entries
   where id = p_entry_id;
end;
$$;

revoke execute on function public.delete_account_charge from public, anon;
grant execute on function public.delete_account_charge to authenticated;
