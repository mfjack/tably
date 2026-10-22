alter table public.memberships
  add column allowed_modules public.app_module[],
  add column can_access_settings boolean not null default true;

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  token text not null unique
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  invitee_name text not null check (char_length(trim(invitee_name)) between 1 and 60),
  allowed_modules public.app_module[] not null default '{}',
  can_access_settings boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz
);

create index organization_invitations_organization_id_idx
  on public.organization_invitations (organization_id, created_at desc);

alter table public.organization_invitations enable row level security;

create policy "organization_invitations: owners read" on public.organization_invitations
  for select to authenticated
  using (public.has_role(organization_id, array['owner']::public.member_role[]));

create policy "organization_invitations: owners insert" on public.organization_invitations
  for insert to authenticated
  with check (public.has_role(organization_id, array['owner']::public.member_role[]));

create policy "organization_invitations: owners delete" on public.organization_invitations
  for delete to authenticated
  using (public.has_role(organization_id, array['owner']::public.member_role[]));

create function public.get_invitation(p_token text)
returns table (organization_name text, invitee_name text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name,
         i.invitee_name,
         case
           when i.accepted_at is not null then 'accepted'
           when i.expires_at < now() then 'expired'
           else 'pending'
         end
    from public.organization_invitations i
    join public.organizations o on o.id = i.organization_id
   where i.token = p_token;
$$;

revoke execute on function public.get_invitation from public;
grant execute on function public.get_invitation to anon, authenticated;

create function public.accept_invitation(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.organization_invitations;
  v_user_id uuid := auth.uid();
  v_slug text;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_invitation
    from public.organization_invitations
   where token = p_token
   for update;

  if not found then
    raise exception 'invitation not found' using errcode = 'TB037';
  end if;
  if v_invitation.accepted_at is not null then
    raise exception 'invitation already used' using errcode = 'TB038';
  end if;
  if v_invitation.expires_at < now() then
    raise exception 'invitation expired' using errcode = 'TB039';
  end if;
  if exists (
    select 1 from public.memberships
     where organization_id = v_invitation.organization_id and user_id = v_user_id
  ) then
    raise exception 'already a member' using errcode = 'TB040';
  end if;

  insert into public.memberships (
    organization_id, user_id, role, allowed_modules, can_access_settings
  )
  values (
    v_invitation.organization_id,
    v_user_id,
    'manager',
    v_invitation.allowed_modules,
    v_invitation.can_access_settings
  );

  update public.organization_invitations
     set accepted_by = v_user_id, accepted_at = now()
   where id = v_invitation.id;

  select slug into v_slug from public.organizations where id = v_invitation.organization_id;
  return v_slug;
end;
$$;

revoke execute on function public.accept_invitation from public, anon;
grant execute on function public.accept_invitation to authenticated;

create function public.list_organization_members(p_organization_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role public.member_role,
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
    select m.user_id, p.full_name, u.email::text, m.role, m.allowed_modules,
           m.can_access_settings, m.created_at
      from public.memberships m
      join auth.users u on u.id = m.user_id
      left join public.profiles p on p.id = m.user_id
     where m.organization_id = p_organization_id
     order by m.role = 'owner' desc, p.full_name;
end;
$$;

revoke execute on function public.list_organization_members from public, anon;
grant execute on function public.list_organization_members to authenticated;

create function public.update_member_access(
  p_organization_id uuid,
  p_user_id uuid,
  p_allowed_modules public.app_module[],
  p_can_access_settings boolean
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
     set allowed_modules = p_allowed_modules,
         can_access_settings = p_can_access_settings
   where organization_id = p_organization_id
     and user_id = p_user_id
     and role <> 'owner';

  if not found then
    raise exception 'member not found' using errcode = 'TB041';
  end if;
end;
$$;

revoke execute on function public.update_member_access from public, anon;
grant execute on function public.update_member_access to authenticated;

create function public.remove_member(p_organization_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.memberships
   where organization_id = p_organization_id
     and user_id = p_user_id
     and role <> 'owner';

  if not found then
    raise exception 'member not found' using errcode = 'TB041';
  end if;
end;
$$;

revoke execute on function public.remove_member from public, anon;
grant execute on function public.remove_member to authenticated;
