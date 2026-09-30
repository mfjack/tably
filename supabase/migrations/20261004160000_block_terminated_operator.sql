create function public.is_operator_employee_active(p_operator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select e.admission_date <= public.organization_today(e.organization_id)
         and (
           e.termination_date is null
           or e.termination_date >= public.organization_today(e.organization_id)
         )
        from public.operators o
        join public.employees e on e.id = o.employee_id
       where o.id = p_operator_id
    ),
    true
  );
$$;

revoke execute on function public.is_operator_employee_active from public, anon, authenticated;

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
     or v_operator.pin_hash is null
     or not public.is_operator_employee_active(p_operator_id) then
    return false;
  end if;

  return v_operator.pin_hash = extensions.crypt(coalesce(p_pin, ''), v_operator.pin_hash);
end;
$$;

revoke execute on function public.verify_operator_pin from public, anon;

create or replace function public.create_operator_pin(p_operator_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator public.operators;
begin
  select * into v_operator from public.operators where id = p_operator_id for update;

  if not found
     or not public.is_member(v_operator.organization_id)
     or not public.is_operator_employee_active(p_operator_id) then
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
