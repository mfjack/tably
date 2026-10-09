create type public.task_kind as enum ('check', 'temperature');

create type public.task_period as enum (
  'opening',
  'service',
  'closing',
  'cleaning',
  'food_safety'
);

alter table public.task_lists
  add column period public.task_period;

alter table public.tasks
  add column kind public.task_kind not null default 'check',
  add column instructions text check (char_length(instructions) <= 1000),
  add column min_temperature numeric(5, 1),
  add column max_temperature numeric(5, 1),
  add constraint tasks_temperature_range_check check (
    (kind = 'check' and min_temperature is null and max_temperature is null)
    or (
      kind = 'temperature'
      and (min_temperature is not null or max_temperature is not null)
      and (min_temperature is null or max_temperature is null or min_temperature <= max_temperature)
    )
  );

alter table public.task_completions
  add column temperature numeric(5, 1);

create index task_completions_temperature_idx
  on public.task_completions (organization_id, completed_on)
  where temperature is not null;

drop function public.set_task_done(uuid, boolean);

create function public.set_task_done(
  p_task_id uuid,
  p_is_done boolean,
  p_temperature numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks;
  v_today date;
  v_period_start date;
begin
  select * into v_task from public.tasks where id = p_task_id;

  if not found or not public.is_member(v_task.organization_id) then
    raise exception 'task not found' using errcode = 'P0002';
  end if;

  if p_is_done and v_task.kind = 'temperature' and p_temperature is null then
    raise exception 'temperature required' using errcode = '22023';
  end if;

  v_today := public.organization_today(v_task.organization_id);
  v_period_start := public.task_period_start(v_task.frequency, v_today);

  if p_is_done then
    insert into public.task_completions (
      organization_id, task_id, completed_on, period_start, operator_name, temperature
    )
    values (
      v_task.organization_id,
      p_task_id,
      v_today,
      v_period_start,
      public.current_operator_name(v_task.organization_id),
      case when v_task.kind = 'temperature' then p_temperature end
    )
    on conflict (task_id, period_start) do nothing;
  else
    delete from public.task_completions
     where task_id = p_task_id
       and period_start = v_period_start;
  end if;
end;
$$;

revoke execute on function public.set_task_done(uuid, boolean, numeric) from public, anon;
grant execute on function public.set_task_done(uuid, boolean, numeric) to authenticated;
