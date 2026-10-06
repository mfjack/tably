create function public.max_day_punches()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 4;
$$;

create function public.count_day_punches(p_employee_id uuid, p_work_date date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from public.time_punches p
   where p.employee_id = p_employee_id
     and p.work_date = p_work_date
     and not exists (select 1 from public.time_punch_voids v where v.punch_id = p.id);
$$;

revoke execute on function public.count_day_punches from public, anon, authenticated;

create or replace function public.register_time_punch(p_employee_id uuid, p_pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_employee public.employees;
  v_now timestamptz := now();
  v_today date;
  v_work_date date;
  v_last public.time_punches;
  v_open_count integer;
  v_punch public.time_punches;
  v_max_attempts constant smallint := 5;
begin
  select * into v_employee from public.employees where id = p_employee_id;

  if not found or not public.is_member(v_employee.organization_id) then
    return jsonb_build_object('status', 'not_found');
  end if;

  v_today := public.organization_today(v_employee.organization_id);

  if v_employee.admission_date > v_today
     or (v_employee.termination_date is not null and v_employee.termination_date < v_today) then
    return jsonb_build_object('status', 'inactive');
  end if;

  if v_employee.pin_locked_until is not null and v_employee.pin_locked_until > v_now then
    return jsonb_build_object('status', 'locked', 'lockedUntil', v_employee.pin_locked_until);
  end if;

  if v_employee.pin_hash is null
     or v_employee.pin_hash <> extensions.crypt(coalesce(p_pin, ''), v_employee.pin_hash) then
    update public.employees
       set failed_pin_attempts = case
             when failed_pin_attempts + 1 >= v_max_attempts then 0
             else failed_pin_attempts + 1
           end,
           pin_locked_until = case
             when failed_pin_attempts + 1 >= v_max_attempts then v_now + interval '5 minutes'
           end
     where id = p_employee_id;

    return jsonb_build_object('status', 'invalid_pin');
  end if;

  if v_employee.failed_pin_attempts > 0 or v_employee.pin_locked_until is not null then
    update public.employees
       set failed_pin_attempts = 0,
           pin_locked_until = null
     where id = p_employee_id;
  end if;

  select p.* into v_last
    from public.time_punches p
   where p.employee_id = p_employee_id
     and not exists (select 1 from public.time_punch_voids v where v.punch_id = p.id)
   order by p.punched_at desc
   limit 1;

  if found and v_now - v_last.punched_at < interval '10 minutes' then
    return jsonb_build_object('status', 'duplicate', 'punchedAt', v_last.punched_at);
  end if;

  v_work_date := v_today;

  if found and v_last.work_date < v_today and v_now - v_last.punched_at < interval '16 hours' then
    select count(*) into v_open_count
      from public.time_punches p
     where p.employee_id = p_employee_id
       and p.work_date = v_last.work_date
       and not exists (select 1 from public.time_punch_voids v where v.punch_id = p.id);

    if v_open_count % 2 = 1 and v_open_count < public.max_day_punches() then
      v_work_date := v_last.work_date;
    end if;
  end if;

  if public.count_day_punches(p_employee_id, v_work_date) >= public.max_day_punches() then
    return jsonb_build_object('status', 'day_complete');
  end if;

  v_punch := public.append_time_punch(
    v_employee.organization_id, p_employee_id, v_now, v_work_date, 'clock', null
  );

  return jsonb_build_object(
    'status', 'registered',
    'nsr', v_punch.nsr,
    'punchedAt', v_punch.punched_at,
    'workDate', v_punch.work_date,
    'hash', v_punch.hash,
    'employeeName', v_employee.name,
    'employeeCpf', v_employee.cpf,
    'employeePis', v_employee.pis,
    'dayPunches', (
      select coalesce(jsonb_agg(p.punched_at order by p.punched_at), '[]'::jsonb)
        from public.time_punches p
       where p.employee_id = p_employee_id
         and p.work_date = v_work_date
         and not exists (select 1 from public.time_punch_voids v where v.punch_id = p.id)
    )
  );
end;
$function$;

create or replace function public.add_manual_time_punch(p_employee_id uuid, p_punched_at timestamp with time zone, p_work_date date, p_reason text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_employee public.employees;
  v_punch public.time_punches;
begin
  select * into v_employee from public.employees where id = p_employee_id;

  if not found
     or not public.has_role(v_employee.organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'employee not found' using errcode = 'P0002';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'reason is required' using errcode = '22023';
  end if;

  if p_punched_at > now() then
    raise exception 'punch in the future' using errcode = '22023';
  end if;

  if abs(p_punched_at::date - p_work_date) > 1 then
    raise exception 'work date too far from punch' using errcode = '22023';
  end if;

  if public.count_day_punches(p_employee_id, p_work_date) >= public.max_day_punches() then
    raise exception 'day already has all punches' using errcode = 'TB031';
  end if;

  v_punch := public.append_time_punch(
    v_employee.organization_id, p_employee_id, p_punched_at, p_work_date, 'manual', trim(p_reason)
  );

  return v_punch.nsr;
end;
$function$;
