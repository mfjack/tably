create or replace function public.current_operator_name(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.full_name
    from public.profiles p
    join public.memberships m on m.user_id = p.id
   where p.id = auth.uid()
     and m.organization_id = p_organization_id;
$$;

create or replace function public.apply_person_pin_hash(
  p_employee_id uuid,
  p_operator_id uuid,
  p_pin_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_employee_id is not null then
    update public.employees
       set pin_hash = p_pin_hash,
           failed_pin_attempts = 0,
           pin_locked_until = null
     where id = p_employee_id;
  end if;
end;
$$;

create or replace function public.reset_person_pin(
  p_employee_id uuid default null,
  p_operator_id uuid default null
)
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

  perform public.apply_person_pin_hash(p_employee_id, null, null);
end;
$$;

create function public.grant_module_to_settings_members(
  p_organization_id uuid,
  p_module public.app_module
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.memberships
     set allowed_modules = array_append(allowed_modules, p_module)
   where organization_id = p_organization_id
     and can_access_settings
     and allowed_modules is not null
     and not (p_module = any (allowed_modules));
end;
$$;

revoke execute on function public.grant_module_to_settings_members from public, anon;
grant execute on function public.grant_module_to_settings_members to authenticated;

drop trigger if exists employees_sync_operator_name on public.employees;

drop function public.sync_operator_name();
drop function public.save_employee_access(uuid, boolean, public.app_module[], boolean);
drop function public.grant_module_to_settings_operators(uuid, public.app_module);
drop function public.save_operator(uuid, text, public.app_module[], boolean, text, uuid);
drop function public.delete_operator(uuid);
drop function public.create_operator_pin(uuid, text);
drop function public.verify_operator_pin(uuid, text);
drop function public.is_operator_employee_active(uuid);
drop function public.ensure_operator_with_settings(uuid);

alter table public.tasks
  drop constraint tasks_assigned_operator_fkey,
  drop column assigned_operator_id,
  add column assigned_user_id uuid references auth.users (id) on delete set null;

drop table public.operators;

drop function public.enforce_operator_limit();
drop function public.get_operator_limit(uuid);
