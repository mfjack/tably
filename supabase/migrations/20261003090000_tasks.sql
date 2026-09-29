create table public.task_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  list_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (list_id, organization_id)
    references public.task_lists (id, organization_id) on delete cascade
);

create index tasks_list_id_idx on public.tasks (list_id, position);

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  task_id uuid not null,
  completed_on date not null,
  operator_name text,
  completed_by uuid references auth.users (id) on delete set null default auth.uid(),
  completed_at timestamptz not null default now(),
  unique (task_id, completed_on),
  foreign key (task_id, organization_id)
    references public.tasks (id, organization_id) on delete cascade
);

create index task_completions_day_idx on public.task_completions (organization_id, completed_on);

create trigger task_lists_updated_at
  before update on public.task_lists
  for each row execute function public.set_updated_at();

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.task_lists enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

create policy "task_lists: members read" on public.task_lists
  for select to authenticated using (public.is_member(organization_id));

create policy "task_lists: managers write" on public.task_lists
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "tasks: members read" on public.tasks
  for select to authenticated using (public.is_member(organization_id));

create policy "tasks: managers write" on public.tasks
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "task_completions: members read" on public.task_completions
  for select to authenticated using (public.is_member(organization_id));

create function public.organization_today(p_organization_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone timezone)::date
    from public.organizations
   where id = p_organization_id;
$$;

grant execute on function public.organization_today to authenticated;

create function public.set_task_done(p_task_id uuid, p_is_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks;
  v_today date;
begin
  select * into v_task from public.tasks where id = p_task_id;

  if not found or not public.is_member(v_task.organization_id) then
    raise exception 'task not found' using errcode = 'P0002';
  end if;

  v_today := public.organization_today(v_task.organization_id);

  if p_is_done then
    insert into public.task_completions (organization_id, task_id, completed_on, operator_name)
    values (
      v_task.organization_id,
      p_task_id,
      v_today,
      public.current_operator_name(v_task.organization_id)
    )
    on conflict (task_id, completed_on) do nothing;
  else
    delete from public.task_completions
     where task_id = p_task_id
       and completed_on = v_today;
  end if;
end;
$$;

revoke execute on function public.set_task_done from public, anon;
grant execute on function public.set_task_done to authenticated;
