alter table public.memberships
  add column has_owner_access boolean not null default false;

create or replace function public.has_role(org_id uuid, roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id
      and m.user_id = (select auth.uid())
      and (
        m.role = any (roles)
        or ('owner' = any (roles) and m.has_owner_access)
      )
  );
$$;

create function public.is_primary_owner(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

revoke all on function public.is_primary_owner(uuid) from public, anon;
grant execute on function public.is_primary_owner(uuid) to authenticated;

drop policy "organizations: dono exclui" on public.organizations;
create policy "organizations: dono exclui" on public.organizations
  for delete to authenticated
  using (public.is_primary_owner(id));

drop policy "memberships: dono adiciona" on public.memberships;
create policy "memberships: dono adiciona" on public.memberships
  for insert to authenticated
  with check (public.is_primary_owner(organization_id));

drop policy "memberships: dono altera" on public.memberships;
create policy "memberships: dono altera" on public.memberships
  for update to authenticated
  using (public.is_primary_owner(organization_id))
  with check (public.is_primary_owner(organization_id));

drop policy "memberships: dono remove ou o próprio sai" on public.memberships;
create policy "memberships: dono remove ou o próprio sai" on public.memberships
  for delete to authenticated
  using (
    public.is_primary_owner(organization_id)
    or user_id = (select auth.uid())
  );

drop function public.list_organization_members(uuid);

create function public.list_organization_members(p_organization_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role public.member_role,
  has_owner_access boolean,
  allowed_modules public.app_module[],
  can_access_settings boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
    select m.user_id, p.full_name, u.email::text, m.role, m.has_owner_access,
           m.allowed_modules, m.can_access_settings, m.created_at
      from public.memberships m
      join auth.users u on u.id = m.user_id
      left join public.profiles p on p.id = m.user_id
     where m.organization_id = p_organization_id
     order by m.role = 'owner' desc, m.has_owner_access desc, p.full_name;
end;
$$;

revoke all on function public.list_organization_members(uuid) from public, anon;
grant execute on function public.list_organization_members(uuid) to authenticated;

drop function public.update_member_access(uuid, uuid, text, public.app_module[], boolean);

create function public.update_member_access(
  p_organization_id uuid,
  p_user_id uuid,
  p_full_name text,
  p_allowed_modules public.app_module[],
  p_can_access_settings boolean,
  p_has_owner_access boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.memberships
     set has_owner_access = p_has_owner_access,
         allowed_modules = case when p_has_owner_access then null else p_allowed_modules end,
         can_access_settings = p_has_owner_access or p_can_access_settings
   where organization_id = p_organization_id
     and user_id = p_user_id
     and role <> 'owner';

  if not found then
    raise exception 'member not found' using errcode = 'TB041';
  end if;

  update public.profiles
     set full_name = nullif(trim(p_full_name), '')
   where id = p_user_id;
end;
$$;

revoke all on function public.update_member_access(uuid, uuid, text, public.app_module[], boolean, boolean) from public, anon;
grant execute on function public.update_member_access(uuid, uuid, text, public.app_module[], boolean, boolean) to authenticated;
