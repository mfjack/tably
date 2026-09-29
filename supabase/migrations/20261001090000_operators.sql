create table public.operators (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  pin_hash text not null,
  allowed_modules public.app_module[] not null default '{}',
  can_access_settings boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index operators_organization_name_idx
  on public.operators (organization_id, lower(trim(name)));

create trigger operators_updated_at
  before update on public.operators
  for each row execute function public.set_updated_at();

alter table public.operators enable row level security;

create policy "operators: members read" on public.operators
  for select to authenticated using (public.is_member(organization_id));

revoke all on public.operators from anon, authenticated;

grant select (id, organization_id, name, allowed_modules, can_access_settings, created_at)
  on public.operators to authenticated;

create function public.ensure_operator_with_settings(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.operators where organization_id = p_organization_id)
     and not exists (
       select 1
         from public.operators
        where organization_id = p_organization_id
          and can_access_settings
     ) then
    raise exception 'at least one operator must access settings' using errcode = 'TB004';
  end if;
end;
$$;

revoke execute on function public.ensure_operator_with_settings from public, anon, authenticated;

create function public.save_operator(
  p_organization_id uuid,
  p_name text,
  p_allowed_modules public.app_module[],
  p_can_access_settings boolean,
  p_pin text default null,
  p_operator_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator_id uuid;
  v_pin text := nullif(p_pin, '');
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed to manage operators' using errcode = '42501';
  end if;

  if v_pin is not null and v_pin !~ '^[0-9]{4,6}$' then
    raise exception 'invalid pin' using errcode = '22023';
  end if;

  if cardinality(coalesce(p_allowed_modules, '{}')) = 0
     and not coalesce(p_can_access_settings, false) then
    raise exception 'operator needs at least one page' using errcode = '22023';
  end if;

  if p_operator_id is null then
    if v_pin is null then
      raise exception 'pin is required' using errcode = '22023';
    end if;

    insert into public.operators (
      organization_id, name, pin_hash, allowed_modules, can_access_settings
    )
    values (
      p_organization_id,
      trim(p_name),
      extensions.crypt(v_pin, extensions.gen_salt('bf')),
      coalesce(p_allowed_modules, '{}'),
      coalesce(p_can_access_settings, false)
    )
    returning id into v_operator_id;
  else
    update public.operators
       set name = trim(p_name),
           pin_hash = case
             when v_pin is null then pin_hash
             else extensions.crypt(v_pin, extensions.gen_salt('bf'))
           end,
           allowed_modules = coalesce(p_allowed_modules, '{}'),
           can_access_settings = coalesce(p_can_access_settings, false)
     where id = p_operator_id
       and organization_id = p_organization_id
    returning id into v_operator_id;

    if v_operator_id is null then
      raise exception 'operator not found' using errcode = 'P0002';
    end if;
  end if;

  perform public.ensure_operator_with_settings(p_organization_id);

  return v_operator_id;
end;
$$;

revoke execute on function public.save_operator from public, anon;

create function public.delete_operator(p_operator_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  select organization_id into v_organization_id
    from public.operators
   where id = p_operator_id;

  if v_organization_id is null
     or not public.has_role(v_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'operator not found' using errcode = 'P0002';
  end if;

  delete from public.operators where id = p_operator_id;

  perform public.ensure_operator_with_settings(v_organization_id);
end;
$$;

revoke execute on function public.delete_operator from public, anon;

create function public.verify_operator_pin(p_operator_id uuid, p_pin text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_operator public.operators;
begin
  select * into v_operator from public.operators where id = p_operator_id;

  if not found or not public.is_member(v_operator.organization_id) then
    return false;
  end if;

  return v_operator.pin_hash = extensions.crypt(coalesce(p_pin, ''), v_operator.pin_hash);
end;
$$;

revoke execute on function public.verify_operator_pin from public, anon;
