drop function public.reset_person_pin(uuid, uuid);

create function public.reset_person_pin(
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
