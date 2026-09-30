alter table public.operators alter column pin_hash drop not null;

alter table public.operators
  add column employee_id uuid,
  add column has_pin boolean generated always as (pin_hash is not null) stored,
  add constraint operators_employee_fkey foreign key (employee_id, organization_id)
    references public.employees (id, organization_id) on delete set null (employee_id);

create unique index operators_employee_id_idx
  on public.operators (employee_id)
  where employee_id is not null;

grant select (employee_id, has_pin) on public.operators to authenticated;

create or replace function public.save_operator(
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
  v_pin_hash text;
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed to manage operators' using errcode = '42501';
  end if;

  if v_pin is not null and v_pin !~ '^[0-9]{4}$' then
    raise exception 'invalid pin' using errcode = '22023';
  end if;

  if cardinality(coalesce(p_allowed_modules, '{}')) = 0
     and not coalesce(p_can_access_settings, false) then
    raise exception 'operator needs at least one page' using errcode = '22023';
  end if;

  if v_pin is not null then
    v_pin_hash := extensions.crypt(v_pin, extensions.gen_salt('bf'));
  end if;

  if p_operator_id is null then
    insert into public.operators (
      organization_id, name, pin_hash, allowed_modules, can_access_settings
    )
    values (
      p_organization_id,
      trim(p_name),
      v_pin_hash,
      coalesce(p_allowed_modules, '{}'),
      coalesce(p_can_access_settings, false)
    )
    returning id into v_operator_id;
  else
    update public.operators
       set name = trim(p_name),
           pin_hash = coalesce(v_pin_hash, pin_hash),
           allowed_modules = coalesce(p_allowed_modules, '{}'),
           can_access_settings = coalesce(p_can_access_settings, false)
     where id = p_operator_id
       and organization_id = p_organization_id
    returning id into v_operator_id;

    if v_operator_id is null then
      raise exception 'operator not found' using errcode = 'P0002';
    end if;

    if v_pin_hash is not null then
      update public.employees e
         set pin_hash = v_pin_hash,
             failed_pin_attempts = 0,
             pin_locked_until = null
        from public.operators o
       where o.id = v_operator_id
         and e.id = o.employee_id;
    end if;
  end if;

  perform public.ensure_operator_with_settings(p_organization_id);

  return v_operator_id;
end;
$$;

revoke execute on function public.save_operator from public, anon;

create or replace function public.verify_operator_pin(p_operator_id uuid, p_pin text)
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

  if not found
     or not public.is_member(v_operator.organization_id)
     or v_operator.pin_hash is null then
    return false;
  end if;

  return v_operator.pin_hash = extensions.crypt(coalesce(p_pin, ''), v_operator.pin_hash);
end;
$$;

revoke execute on function public.verify_operator_pin from public, anon;

create function public.apply_person_pin_hash(
  p_employee_id uuid,
  p_operator_id uuid,
  p_pin_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_id uuid := p_employee_id;
begin
  if v_employee_id is null and p_operator_id is not null then
    select employee_id into v_employee_id
      from public.operators
     where id = p_operator_id;
  end if;

  if v_employee_id is not null then
    update public.employees
       set pin_hash = p_pin_hash,
           failed_pin_attempts = 0,
           pin_locked_until = null
     where id = v_employee_id;

    update public.operators
       set pin_hash = p_pin_hash
     where employee_id = v_employee_id;
  end if;

  if p_operator_id is not null then
    update public.operators
       set pin_hash = p_pin_hash
     where id = p_operator_id;
  end if;
end;
$$;

revoke execute on function public.apply_person_pin_hash from public, anon, authenticated;

create function public.create_operator_pin(p_operator_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator public.operators;
begin
  select * into v_operator from public.operators where id = p_operator_id for update;

  if not found or not public.is_member(v_operator.organization_id) then
    raise exception 'operator not found' using errcode = 'P0002';
  end if;

  if v_operator.pin_hash is not null then
    raise exception 'pin already created' using errcode = 'TB010';
  end if;

  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then
    raise exception 'invalid pin' using errcode = '22023';
  end if;

  perform public.apply_person_pin_hash(
    null, p_operator_id, extensions.crypt(p_pin, extensions.gen_salt('bf'))
  );
end;
$$;

revoke execute on function public.create_operator_pin from public, anon;
grant execute on function public.create_operator_pin to authenticated;

create function public.create_employee_pin(p_employee_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee public.employees;
  v_today date;
begin
  select * into v_employee from public.employees where id = p_employee_id for update;

  if not found or not public.is_member(v_employee.organization_id) then
    raise exception 'employee not found' using errcode = 'P0002';
  end if;

  v_today := public.organization_today(v_employee.organization_id);

  if v_employee.admission_date > v_today
     or (v_employee.termination_date is not null and v_employee.termination_date < v_today) then
    raise exception 'employee inactive' using errcode = 'P0002';
  end if;

  if v_employee.pin_hash is not null then
    raise exception 'pin already created' using errcode = 'TB010';
  end if;

  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then
    raise exception 'invalid pin' using errcode = '22023';
  end if;

  perform public.apply_person_pin_hash(
    p_employee_id, null, extensions.crypt(p_pin, extensions.gen_salt('bf'))
  );
end;
$$;

revoke execute on function public.create_employee_pin from public, anon;
grant execute on function public.create_employee_pin to authenticated;

create function public.reset_person_pin(p_employee_id uuid, p_operator_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  if p_employee_id is not null then
    select organization_id into v_organization_id from public.employees where id = p_employee_id;
  else
    select organization_id into v_organization_id from public.operators where id = p_operator_id;
  end if;

  if v_organization_id is null
     or not public.has_role(v_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;

  perform public.apply_person_pin_hash(p_employee_id, p_operator_id, null);
end;
$$;

revoke execute on function public.reset_person_pin from public, anon;
grant execute on function public.reset_person_pin to authenticated;

create function public.save_employee_access(
  p_employee_id uuid,
  p_is_enabled boolean,
  p_allowed_modules public.app_module[],
  p_can_access_settings boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee public.employees;
  v_operator public.operators;
  v_name text;
begin
  select * into v_employee from public.employees where id = p_employee_id;

  if not found
     or not public.has_role(v_employee.organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'employee not found' using errcode = 'P0002';
  end if;

  v_name := left(trim(v_employee.name), 40);

  if not p_is_enabled then
    delete from public.operators where employee_id = p_employee_id;
    perform public.ensure_operator_with_settings(v_employee.organization_id);
    return;
  end if;

  if cardinality(coalesce(p_allowed_modules, '{}')) = 0
     and not coalesce(p_can_access_settings, false) then
    raise exception 'operator needs at least one page' using errcode = '22023';
  end if;

  select * into v_operator from public.operators where employee_id = p_employee_id;

  if not found then
    select * into v_operator
      from public.operators
     where organization_id = v_employee.organization_id
       and employee_id is null
       and lower(trim(name)) = lower(v_name);
  end if;

  if v_operator.id is null then
    insert into public.operators (
      organization_id, name, pin_hash, allowed_modules, can_access_settings, employee_id
    )
    values (
      v_employee.organization_id,
      v_name,
      v_employee.pin_hash,
      coalesce(p_allowed_modules, '{}'),
      coalesce(p_can_access_settings, false),
      p_employee_id
    );
  else
    update public.operators
       set name = v_name,
           allowed_modules = coalesce(p_allowed_modules, '{}'),
           can_access_settings = coalesce(p_can_access_settings, false),
           employee_id = p_employee_id
     where id = v_operator.id;

    if coalesce(v_operator.pin_hash, v_employee.pin_hash) is not null then
      perform public.apply_person_pin_hash(
        p_employee_id, v_operator.id, coalesce(v_operator.pin_hash, v_employee.pin_hash)
      );
    end if;
  end if;

  perform public.ensure_operator_with_settings(v_employee.organization_id);
end;
$$;

revoke execute on function public.save_employee_access from public, anon;
grant execute on function public.save_employee_access to authenticated;

create function public.sync_operator_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.operators
     set name = left(trim(new.name), 40)
   where employee_id = new.id;
  return new;
end;
$$;

revoke execute on function public.sync_operator_name from public, anon, authenticated;

create trigger employees_sync_operator_name
  after update of name on public.employees
  for each row
  when (old.name is distinct from new.name)
  execute function public.sync_operator_name();
