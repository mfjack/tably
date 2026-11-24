CREATE OR REPLACE FUNCTION public.add_cash_movement(p_organization_id uuid, p_kind cash_movement_kind, p_amount numeric, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_session_id uuid;
  v_movement_id uuid;
  v_entry_id uuid;
  v_note text := nullif(trim(p_note), '');
  v_today date;
  v_actor_name text;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  if p_kind = 'withdrawal' and v_note is null then
    raise exception 'withdrawal reason is required' using errcode = '22023';
  end if;

  select id into v_session_id
    from public.cash_sessions
   where organization_id = p_organization_id
     and closed_at is null
   for update;

  if v_session_id is null then
    raise exception 'cash register is closed' using errcode = 'TB017';
  end if;

  if p_kind = 'withdrawal'
     and round(p_amount, 2) > (public.build_cash_session_summary(v_session_id) ->> 'expectedCash')::numeric then
    raise exception 'withdrawal exceeds cash in drawer' using errcode = 'TB050';
  end if;

  v_actor_name := public.current_actor_name(p_organization_id);

  insert into public.cash_movements (
    organization_id, session_id, kind, amount, note, created_by_name
  )
  values (
    p_organization_id, v_session_id, p_kind, round(p_amount, 2), v_note, v_actor_name
  )
  returning id into v_movement_id;

  if p_kind <> 'withdrawal' then
    return;
  end if;

  v_today := public.organization_today(p_organization_id);

  insert into public.financial_entries (
    organization_id, kind, description, amount, due_date, account_id,
    paid_at, paid_amount, notes, created_by_name, paid_by_name
  )
  values (
    p_organization_id,
    'expense',
    left(v_note, 120),
    round(p_amount, 2),
    v_today,
    (select id from public.financial_accounts
      where organization_id = p_organization_id
        and not is_archived
      order by created_at
      limit 1),
    v_today,
    round(p_amount, 2),
    'Retirada do caixa',
    v_actor_name,
    v_actor_name
  )
  returning id into v_entry_id;

  update public.cash_movements
     set financial_entry_id = v_entry_id
   where id = v_movement_id;
end;
$function$;
