create function public.get_operator_limit(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when subscription.organization_id is null then null
    when (subscription.paid_until is null or now() > subscription.paid_until)
      and now() <= subscription.trial_ends_at then null
    when subscription.plan = 'essential' then 2
    when subscription.plan = 'management' then 5
    else null
  end
  from (select p_organization_id as organization_id) as target
  left join public.subscriptions as subscription
    on subscription.organization_id = target.organization_id;
$$;

revoke execute on function public.get_operator_limit from public, anon, authenticated;

create function public.enforce_operator_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := public.get_operator_limit(new.organization_id);
  v_operator_count integer;
begin
  if v_limit is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('operator-limit:' || new.organization_id::text));

  select count(*) into v_operator_count
    from public.operators
   where organization_id = new.organization_id;

  if v_operator_count >= v_limit then
    raise exception 'operator limit reached' using errcode = 'TB011';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_operator_limit from public, anon, authenticated;

create trigger operators_enforce_plan_limit
  before insert on public.operators
  for each row execute function public.enforce_operator_limit();
