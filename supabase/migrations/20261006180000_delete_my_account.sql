create or replace function public.protect_issued_payslip()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'issued'
       and exists (select 1 from public.organizations where id = old.organization_id) then
      raise exception 'issued payslip cannot be deleted' using errcode = 'TB009';
    end if;
    return old;
  end if;

  if old.status = 'issued' and not (
    new.status = 'draft'
    and new.items = old.items
    and new.manual_items = old.manual_items
    and new.net_amount = old.net_amount
  ) then
    raise exception 'issued payslip cannot be changed' using errcode = 'TB009';
  end if;
  return new;
end;
$$;

create function public.list_my_owned_organizations()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.name
    from public.organizations o
    join public.memberships m on m.organization_id = o.id
   where m.user_id = auth.uid()
     and m.role = 'owner'
   order by o.name;
$$;

revoke execute on function public.list_my_owned_organizations from public, anon;
grant execute on function public.list_my_owned_organizations to authenticated;

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.organizations o
   where exists (
     select 1
       from public.memberships m
      where m.organization_id = o.id
        and m.user_id = v_user_id
        and m.role = 'owner'
   );

  delete from auth.users where id = v_user_id;
end;
$$;

revoke execute on function public.delete_my_account from public, anon;
grant execute on function public.delete_my_account to authenticated;
