create function public.apply_employee_pin_hash(p_employee_id uuid, p_pin_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.employees
     set pin_hash = p_pin_hash,
         failed_pin_attempts = 0,
         pin_locked_until = null
   where id = p_employee_id;
$$;

revoke execute on function public.apply_employee_pin_hash from public, anon, authenticated;

create or replace function public.create_employee_pin(p_employee_id uuid, p_pin text)
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

  perform public.apply_employee_pin_hash(
    p_employee_id, extensions.crypt(p_pin, extensions.gen_salt('bf'))
  );
end;
$$;

drop function public.reset_person_pin(uuid, uuid);

create function public.reset_person_pin(p_employee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  select organization_id into v_organization_id
    from public.employees
   where id = p_employee_id;

  if v_organization_id is null
     or not public.has_role(v_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'person not found' using errcode = 'P0002';
  end if;

  perform public.apply_employee_pin_hash(p_employee_id, null);
end;
$$;

revoke execute on function public.reset_person_pin from public, anon;
grant execute on function public.reset_person_pin to authenticated;

drop function public.apply_person_pin_hash(uuid, uuid, text);
