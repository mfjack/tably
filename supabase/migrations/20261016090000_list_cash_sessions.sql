create function public.list_cash_sessions(
  p_organization_id uuid,
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_timezone text;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  select timezone into v_timezone from public.organizations where id = p_organization_id;

  return coalesce((
    select jsonb_agg(
      public.build_cash_session_summary(cs.id)
      order by cs.opened_at desc
    )
      from public.cash_sessions as cs
     where cs.organization_id = p_organization_id
       and (cs.opened_at at time zone coalesce(v_timezone, 'America/Sao_Paulo'))::date
           between p_start_date and p_end_date
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.list_cash_sessions from public, anon;
grant execute on function public.list_cash_sessions to authenticated;
