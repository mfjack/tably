create or replace function public.admin_delete_organization(p_organization_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_ids uuid[];
  v_asaas_subscription_id text;
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select array_agg(m.user_id)
    into v_owner_ids
    from public.memberships m
   where m.organization_id = p_organization_id
     and m.role = 'owner';

  select s.asaas_subscription_id
    into v_asaas_subscription_id
    from public.subscriptions s
   where s.organization_id = p_organization_id;

  delete from public.organizations where id = p_organization_id;
  if not found then
    raise exception 'organization not found' using errcode = 'P0002';
  end if;

  delete from auth.users u
   where u.id = any(coalesce(v_owner_ids, '{}'))
     and not exists (select 1 from public.memberships m where m.user_id = u.id)
     and not exists (
       select 1 from public.platform_admins a where a.email = lower(u.email)
     );

  return v_asaas_subscription_id;
end;
$$;

revoke all on function public.admin_delete_organization(uuid) from public, anon;
grant execute on function public.admin_delete_organization(uuid) to authenticated;
