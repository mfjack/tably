create type public.task_frequency as enum ('daily', 'weekly', 'monthly');

alter table public.tasks
  add column frequency public.task_frequency not null default 'daily',
  add column due_weekday smallint check (due_weekday between 1 and 7),
  add column due_day smallint check (due_day between 1 and 31),
  add column assigned_operator_id uuid,
  add constraint tasks_due_weekday_frequency_check
    check (due_weekday is null or frequency = 'weekly'),
  add constraint tasks_due_day_frequency_check
    check (due_day is null or frequency = 'monthly'),
  add constraint tasks_assigned_operator_fkey
    foreign key (assigned_operator_id, organization_id)
    references public.operators (id, organization_id) on delete set null (assigned_operator_id);

alter table public.task_completions
  add column period_start date;

update public.task_completions set period_start = completed_on;

alter table public.task_completions
  alter column period_start set not null,
  drop constraint task_completions_task_id_completed_on_key,
  add constraint task_completions_task_period_key unique (task_id, period_start);

create function public.task_period_start(
  p_frequency public.task_frequency,
  p_day date
)
returns date
language sql
immutable
set search_path = ''
as $$
  select case p_frequency
    when 'daily' then p_day
    when 'weekly' then p_day - (extract(isodow from p_day)::integer - 1)
    else date_trunc('month', p_day)::date
  end;
$$;

create or replace function public.set_task_done(p_task_id uuid, p_is_done boolean)
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

  v_today := public.organization_today(v_task.organization_id);
  v_period_start := public.task_period_start(v_task.frequency, v_today);

  if p_is_done then
    insert into public.task_completions (
      organization_id, task_id, completed_on, period_start, operator_name
    )
    values (
      v_task.organization_id,
      p_task_id,
      v_today,
      v_period_start,
      public.current_operator_name(v_task.organization_id)
    )
    on conflict (task_id, period_start) do nothing;
  else
    delete from public.task_completions
     where task_id = p_task_id
       and period_start = v_period_start;
  end if;
end;
$$;
