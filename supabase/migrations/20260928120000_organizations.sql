
create type public.member_role as enum (
  'owner',
  'manager',
  'cashier',
  'kitchen',
  'waiter'
);

create type public.business_type as enum (
  'coffee_shop',
  'restaurant',
  'acai_shop',
  'snack_bar',
  'bakery',
  'bar',
  'ice_cream_shop',
  'other'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  business_type public.business_type not null default 'other',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);

create function public.is_member(org_id uuid)
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
  );
$$;

create function public.has_role(org_id uuid, roles public.member_role[])
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
      and m.role = any (roles)
  );
$$;

create function public.create_organization(
  p_name text,
  p_slug text,
  p_business_type public.business_type
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org public.organizations;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.organizations (name, slug, business_type, created_by)
  values (trim(p_name), p_slug, p_business_type, v_user)
  returning * into v_org;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org.id, v_user, 'owner');

  return v_org;
end;
$$;

revoke execute on function public.create_organization from public, anon;
grant execute on function public.create_organization to authenticated;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

create policy "profiles: ver o próprio e da equipe"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id
        and public.is_member(m.organization_id)
    )
  );

create policy "profiles: editar o próprio"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "organizations: membros veem"
  on public.organizations for select to authenticated
  using (public.is_member(id));

create policy "organizations: dono e gerente editam"
  on public.organizations for update to authenticated
  using (public.has_role(id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(id, array['owner', 'manager']::public.member_role[]));

create policy "organizations: dono exclui"
  on public.organizations for delete to authenticated
  using (public.has_role(id, array['owner']::public.member_role[]));

create policy "memberships: membros veem a equipe"
  on public.memberships for select to authenticated
  using (public.is_member(organization_id));

create policy "memberships: dono adiciona"
  on public.memberships for insert to authenticated
  with check (public.has_role(organization_id, array['owner']::public.member_role[]));

create policy "memberships: dono altera"
  on public.memberships for update to authenticated
  using (public.has_role(organization_id, array['owner']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner']::public.member_role[]));

create policy "memberships: dono remove ou o próprio sai"
  on public.memberships for delete to authenticated
  using (
    public.has_role(organization_id, array['owner']::public.member_role[])
    or user_id = (select auth.uid())
  );
