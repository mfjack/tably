create function public.add_manual_time_punches(
  p_employee_id uuid,
  p_work_date date,
  p_punched_ats timestamptz[],
  p_reason text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_punched_at timestamptz;
begin
  if coalesce(cardinality(p_punched_ats), 0) = 0 then
    raise exception 'no punches' using errcode = '22023';
  end if;

  foreach v_punched_at in array p_punched_ats loop
    perform public.add_manual_time_punch(p_employee_id, v_punched_at, p_work_date, p_reason);
  end loop;
end;
$$;

revoke execute on function public.add_manual_time_punches from public, anon;
grant execute on function public.add_manual_time_punches to authenticated;
