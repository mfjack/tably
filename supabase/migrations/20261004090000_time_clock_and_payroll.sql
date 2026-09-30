alter type public.app_module add value 'time_clock';
alter type public.app_module add value 'employees';
alter type public.app_module add value 'payroll';

create type public.employment_type as enum ('clt', 'apprentice', 'intern');
create type public.overtime_policy as enum ('paid', 'hour_bank');
create type public.time_punch_source as enum ('clock', 'manual');
create type public.time_off_kind as enum (
  'medical_certificate',
  'vacation',
  'day_off',
  'justified_absence'
);
create type public.payslip_status as enum ('draft', 'issued');

create table public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  mark_tolerance_minutes smallint not null default 5 check (mark_tolerance_minutes between 0 and 30),
  daily_tolerance_minutes smallint not null default 10 check (daily_tolerance_minutes between 0 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index work_schedules_organization_name_idx
  on public.work_schedules (organization_id, lower(trim(name)));

create table public.work_schedule_days (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  schedule_id uuid not null,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  break_start time,
  break_end time,
  end_time time not null,
  unique (schedule_id, weekday),
  check ((break_start is null) = (break_end is null)),
  foreign key (schedule_id, organization_id)
    references public.work_schedules (id, organization_id) on delete cascade
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  cpf text not null check (cpf ~ '^[0-9]{11}$'),
  pis text check (pis ~ '^[0-9]{11}$'),
  birth_date date,
  phone text check (phone ~ '^[0-9]{10,11}$'),
  job_title text not null check (char_length(trim(job_title)) between 1 and 60),
  employment_type public.employment_type not null default 'clt',
  admission_date date not null,
  effective_date date,
  termination_date date,
  salary numeric(12, 2) not null check (salary > 0),
  work_schedule_id uuid,
  overtime_policy public.overtime_policy not null default 'paid',
  dependents smallint not null default 0 check (dependents between 0 and 20),
  has_transport_voucher boolean not null default false,
  notes text check (char_length(notes) <= 300),
  pin_hash text,
  has_pin boolean generated always as (pin_hash is not null) stored,
  failed_pin_attempts smallint not null default 0,
  pin_locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, cpf),
  check (effective_date is null or effective_date >= admission_date),
  check (termination_date is null or termination_date >= admission_date),
  foreign key (work_schedule_id, organization_id)
    references public.work_schedules (id, organization_id) on delete set null (work_schedule_id)
);

create table public.employee_salary_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null,
  salary numeric(12, 2) not null,
  changed_by_name text,
  changed_at timestamptz not null default now(),
  foreign key (employee_id, organization_id)
    references public.employees (id, organization_id) on delete cascade
);

create index employee_salary_history_employee_idx
  on public.employee_salary_history (employee_id, changed_at desc);

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  holiday_date date not null,
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (organization_id, holiday_date)
);

create table public.time_punch_counters (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  last_nsr bigint not null default 0,
  last_hash text not null default ''
);

create table public.time_punches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null,
  nsr bigint not null,
  punched_at timestamptz not null,
  work_date date not null,
  source public.time_punch_source not null,
  reason text check (char_length(reason) <= 200),
  recorded_by_name text,
  recorded_by uuid references auth.users (id) on delete set null default auth.uid(),
  hash text not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, nsr),
  check (source = 'clock' or reason is not null),
  foreign key (employee_id, organization_id)
    references public.employees (id, organization_id)
);

create index time_punches_employee_day_idx
  on public.time_punches (employee_id, work_date, punched_at);

create table public.time_punch_voids (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  punch_id uuid not null unique,
  reason text not null check (char_length(trim(reason)) between 3 and 200),
  voided_by_name text,
  voided_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (punch_id, organization_id)
    references public.time_punches (id, organization_id)
);

create table public.employee_time_off (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null,
  kind public.time_off_kind not null,
  start_date date not null,
  end_date date not null,
  notes text check (char_length(notes) <= 200),
  created_by_name text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  foreign key (employee_id, organization_id)
    references public.employees (id, organization_id) on delete cascade
);

create index employee_time_off_employee_idx
  on public.employee_time_off (employee_id, start_date);

create table public.payroll_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  inss_brackets jsonb not null default '[
    {"upTo": 1621.00, "rate": 0.075},
    {"upTo": 2902.84, "rate": 0.09},
    {"upTo": 4354.27, "rate": 0.12},
    {"upTo": 8475.55, "rate": 0.14}
  ]',
  irrf_brackets jsonb not null default '[
    {"upTo": 2428.80, "rate": 0, "deduction": 0},
    {"upTo": 2826.65, "rate": 0.075, "deduction": 182.16},
    {"upTo": 3751.05, "rate": 0.15, "deduction": 394.16},
    {"upTo": 4664.68, "rate": 0.225, "deduction": 675.49},
    {"upTo": null, "rate": 0.275, "deduction": 908.73}
  ]',
  irrf_dependent_deduction numeric(10, 2) not null default 189.59,
  irrf_simplified_deduction numeric(10, 2) not null default 607.20,
  irrf_exempt_up_to numeric(10, 2) not null default 5000.00,
  irrf_reduction_up_to numeric(10, 2) not null default 7350.00,
  irrf_reduction_constant numeric(10, 2) not null default 978.62,
  irrf_reduction_factor numeric(10, 6) not null default 0.133145,
  overtime_rate numeric(5, 4) not null default 0.5 check (overtime_rate >= 0.5),
  rest_day_overtime_rate numeric(5, 4) not null default 1 check (rest_day_overtime_rate >= 1),
  night_shift_rate numeric(5, 4) not null default 0.2 check (night_shift_rate >= 0.2),
  transport_voucher_rate numeric(5, 4) not null default 0.06 check (transport_voucher_rate between 0 and 0.06),
  updated_at timestamptz not null default now()
);

create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_id uuid not null,
  reference_month date not null check (extract(day from reference_month) = 1),
  status public.payslip_status not null default 'draft',
  employee_snapshot jsonb not null,
  items jsonb not null default '[]',
  manual_items jsonb not null default '[]',
  timesheet_summary jsonb not null default '{}',
  gross_amount numeric(12, 2) not null default 0,
  deduction_amount numeric(12, 2) not null default 0,
  net_amount numeric(12, 2) not null default 0,
  inss_base numeric(12, 2) not null default 0,
  irrf_base numeric(12, 2) not null default 0,
  fgts_base numeric(12, 2) not null default 0,
  fgts_amount numeric(12, 2) not null default 0,
  hour_bank_balance_minutes integer not null default 0,
  issued_at timestamptz,
  issued_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, reference_month),
  foreign key (employee_id, organization_id)
    references public.employees (id, organization_id)
);

create index payslips_month_idx on public.payslips (organization_id, reference_month);

create trigger work_schedules_updated_at
  before update on public.work_schedules
  for each row execute function public.set_updated_at();

create trigger employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

create trigger payroll_settings_updated_at
  before update on public.payroll_settings
  for each row execute function public.set_updated_at();

create trigger payslips_updated_at
  before update on public.payslips
  for each row execute function public.set_updated_at();

create function public.record_employee_salary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.salary is distinct from old.salary then
    insert into public.employee_salary_history (organization_id, employee_id, salary, changed_by_name)
    values (new.organization_id, new.id, new.salary, public.current_operator_name(new.organization_id));
  end if;
  return new;
end;
$$;

revoke execute on function public.record_employee_salary from public, anon, authenticated;

create trigger employees_salary_history
  after insert or update of salary on public.employees
  for each row execute function public.record_employee_salary();

create function public.prevent_time_record_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.organizations where id = old.organization_id) then
    raise exception 'time records are immutable' using errcode = 'TB008';
  end if;
  return old;
end;
$$;

create trigger time_punches_immutable
  before update or delete on public.time_punches
  for each row execute function public.prevent_time_record_change();

create trigger time_punch_voids_immutable
  before update or delete on public.time_punch_voids
  for each row execute function public.prevent_time_record_change();

create function public.protect_issued_payslip()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'issued' then
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

create function public.stamp_payslip_issue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'issued' and old.status = 'draft' then
    new.issued_at := now();
    new.issued_by_name := public.current_operator_name(new.organization_id);
  elsif new.status = 'draft' and old.status = 'issued' then
    new.issued_at := null;
    new.issued_by_name := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.stamp_payslip_issue from public, anon, authenticated;

create trigger payslips_stamp_issue
  before update on public.payslips
  for each row execute function public.stamp_payslip_issue();

create trigger payslips_protect_issued
  before update or delete on public.payslips
  for each row execute function public.protect_issued_payslip();

alter table public.work_schedules enable row level security;
alter table public.work_schedule_days enable row level security;
alter table public.employees enable row level security;
alter table public.employee_salary_history enable row level security;
alter table public.holidays enable row level security;
alter table public.time_punch_counters enable row level security;
alter table public.time_punches enable row level security;
alter table public.time_punch_voids enable row level security;
alter table public.employee_time_off enable row level security;
alter table public.payroll_settings enable row level security;
alter table public.payslips enable row level security;

create policy "work_schedules: managers all" on public.work_schedules
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "work_schedule_days: managers all" on public.work_schedule_days
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "employees: managers all" on public.employees
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "employee_salary_history: managers read" on public.employee_salary_history
  for select to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "holidays: members read" on public.holidays
  for select to authenticated using (public.is_member(organization_id));

create policy "holidays: managers write" on public.holidays
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "time_punches: managers read" on public.time_punches
  for select to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "time_punch_voids: managers read" on public.time_punch_voids
  for select to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "employee_time_off: managers all" on public.employee_time_off
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "payroll_settings: managers all" on public.payroll_settings
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "payslips: managers all" on public.payslips
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

revoke all on public.employees from anon, authenticated;
grant select (
  id, organization_id, name, cpf, pis, birth_date, phone, job_title, employment_type,
  admission_date, effective_date, termination_date, salary, work_schedule_id,
  overtime_policy, dependents, has_transport_voucher, notes, has_pin, created_at, updated_at
) on public.employees to authenticated;
grant insert (
  organization_id, name, cpf, pis, birth_date, phone, job_title, employment_type,
  admission_date, effective_date, termination_date, salary, work_schedule_id,
  overtime_policy, dependents, has_transport_voucher, notes
) on public.employees to authenticated;
grant update (
  name, cpf, pis, birth_date, phone, job_title, employment_type,
  admission_date, effective_date, termination_date, salary, work_schedule_id,
  overtime_policy, dependents, has_transport_voucher, notes
) on public.employees to authenticated;
grant delete on public.employees to authenticated;

revoke all on public.time_punch_counters from anon, authenticated;
revoke insert, update, delete on public.time_punches from anon, authenticated;
revoke insert, update, delete on public.time_punch_voids from anon, authenticated;

create function public.append_time_punch(
  p_organization_id uuid,
  p_employee_id uuid,
  p_punched_at timestamptz,
  p_work_date date,
  p_source public.time_punch_source,
  p_reason text
)
returns public.time_punches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_counter public.time_punch_counters;
  v_nsr bigint;
  v_hash text;
  v_punch public.time_punches;
begin
  insert into public.time_punch_counters (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  select * into v_counter
    from public.time_punch_counters
   where organization_id = p_organization_id
   for update;

  v_nsr := v_counter.last_nsr + 1;
  v_hash := encode(
    extensions.digest(
      concat_ws(
        '|',
        v_counter.last_hash,
        v_nsr::text,
        p_employee_id::text,
        to_char(p_punched_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        p_work_date::text,
        p_source::text,
        coalesce(p_reason, '')
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.time_punches (
    organization_id, employee_id, nsr, punched_at, work_date, source, reason, recorded_by_name, hash
  )
  values (
    p_organization_id,
    p_employee_id,
    v_nsr,
    p_punched_at,
    p_work_date,
    p_source,
    p_reason,
    case when p_source = 'manual' then public.current_operator_name(p_organization_id) end,
    v_hash
  )
  returning * into v_punch;

  update public.time_punch_counters
     set last_nsr = v_nsr,
         last_hash = v_hash
   where organization_id = p_organization_id;

  return v_punch;
end;
$$;

revoke execute on function public.append_time_punch from public, anon, authenticated;

create function public.list_time_clock_employees(p_organization_id uuid)
returns table (id uuid, name text, job_title text, has_pin boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.name, e.job_title, e.pin_hash is not null
    from public.employees e
   where e.organization_id = p_organization_id
     and public.is_member(p_organization_id)
     and e.admission_date <= public.organization_today(p_organization_id)
     and (e.termination_date is null or e.termination_date >= public.organization_today(p_organization_id))
   order by e.name;
$$;

revoke execute on function public.list_time_clock_employees from public, anon;
grant execute on function public.list_time_clock_employees to authenticated;

create function public.register_time_punch(p_employee_id uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

  if found and v_now - v_last.punched_at < interval '1 minute' then
    return jsonb_build_object('status', 'duplicate', 'punchedAt', v_last.punched_at);
  end if;

  v_work_date := v_today;

  if found and v_last.work_date < v_today and v_now - v_last.punched_at < interval '16 hours' then
    select count(*) into v_open_count
      from public.time_punches p
     where p.employee_id = p_employee_id
       and p.work_date = v_last.work_date
       and not exists (select 1 from public.time_punch_voids v where v.punch_id = p.id);

    if v_open_count % 2 = 1 then
      v_work_date := v_last.work_date;
    end if;
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
$$;

revoke execute on function public.register_time_punch from public, anon;
grant execute on function public.register_time_punch to authenticated;

create function public.add_manual_time_punch(
  p_employee_id uuid,
  p_punched_at timestamptz,
  p_work_date date,
  p_reason text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
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

  v_punch := public.append_time_punch(
    v_employee.organization_id, p_employee_id, p_punched_at, p_work_date, 'manual', trim(p_reason)
  );

  return v_punch.nsr;
end;
$$;

revoke execute on function public.add_manual_time_punch from public, anon;
grant execute on function public.add_manual_time_punch to authenticated;

create function public.void_time_punch(p_punch_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_punch public.time_punches;
begin
  select * into v_punch from public.time_punches where id = p_punch_id;

  if not found
     or not public.has_role(v_punch.organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'punch not found' using errcode = 'P0002';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'reason is required' using errcode = '22023';
  end if;

  insert into public.time_punch_voids (organization_id, punch_id, reason, voided_by_name)
  values (
    v_punch.organization_id,
    p_punch_id,
    trim(p_reason),
    public.current_operator_name(v_punch.organization_id)
  )
  on conflict (punch_id) do nothing;
end;
$$;

revoke execute on function public.void_time_punch from public, anon;
grant execute on function public.void_time_punch to authenticated;

create function public.set_employee_pin(p_employee_id uuid, p_pin text)
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
    raise exception 'employee not found' using errcode = 'P0002';
  end if;

  if coalesce(p_pin, '') !~ '^[0-9]{4}$' then
    raise exception 'invalid pin' using errcode = '22023';
  end if;

  update public.employees
     set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
         failed_pin_attempts = 0,
         pin_locked_until = null
   where id = p_employee_id;
end;
$$;

revoke execute on function public.set_employee_pin from public, anon;
grant execute on function public.set_employee_pin to authenticated;

create function public.stamp_time_off_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_by_name := public.current_operator_name(new.organization_id);
  return new;
end;
$$;

revoke execute on function public.stamp_time_off_author from public, anon, authenticated;

create trigger employee_time_off_author
  before insert on public.employee_time_off
  for each row execute function public.stamp_time_off_author();
