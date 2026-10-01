create or replace function public.assign_cash_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'account_entries' then
    if (to_jsonb(new) ->> 'kind') <> 'payment' then
      return new;
    end if;
  end if;

  select id into new.cash_session_id
    from public.cash_sessions
   where organization_id = new.organization_id
     and closed_at is null;

  if new.cash_session_id is null and new.created_at >= now() - interval '5 minutes' then
    raise exception 'cash register is closed' using errcode = 'TB017';
  end if;

  return new;
end;
$$;
