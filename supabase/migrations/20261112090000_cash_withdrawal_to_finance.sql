alter table public.cash_movements
  add column financial_entry_id uuid references public.financial_entries (id) on delete set null;

create or replace function public.add_cash_movement(
  p_organization_id uuid,
  p_kind public.cash_movement_kind,
  p_amount numeric,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

CREATE OR REPLACE FUNCTION public.build_cash_session_summary(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with session as (
    select * from public.cash_sessions where id = p_session_id
  ),
  payments as (
    select method, amount, surcharge, fee_percent, order_id
      from public.order_payments
     where cash_session_id = p_session_id
    union all
    select payment_method, amount, surcharge, fee_percent, null
      from public.account_entries
     where cash_session_id = p_session_id
       and kind = 'payment'
  ),
  totals as (
    select
      coalesce(sum(amount) filter (where method = 'cash'), 0) as cash_received,
      coalesce(sum(amount), 0) as received_total,
      count(distinct order_id) as order_count
      from payments
  ),
  movement_totals as (
    select
      coalesce(sum(amount) filter (where kind = 'supply'), 0) as supplies,
      coalesce(sum(amount) filter (where kind = 'withdrawal'), 0) as withdrawals
      from public.cash_movements
     where session_id = p_session_id
  )
  select jsonb_build_object(
    'id', s.id,
    'openedAt', s.opened_at,
    'openedByName', s.opened_by_name,
    'openingAmount', s.opening_amount,
    'closedAt', s.closed_at,
    'closedByName', s.closed_by_name,
    'countedCash', s.counted_cash,
    'closingNote', s.closing_note,
    'orderCount', t.order_count,
    'receivedTotal', t.received_total,
    'cashSales', (
      select coalesce(sum(op.amount), 0)
        from public.order_payments as op
       where op.cash_session_id = p_session_id and op.method = 'cash'
    ),
    'cashSalesCount', (
      select count(distinct op.order_id)
        from public.order_payments as op
       where op.cash_session_id = p_session_id and op.method = 'cash'
    ),
    'cashAccountPayments', (
      select coalesce(sum(ae.amount), 0)
        from public.account_entries as ae
       where ae.cash_session_id = p_session_id
         and ae.kind = 'payment'
         and ae.payment_method = 'cash'
    ),
    'cashEntries', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', entry.id,
          'kind', entry.kind,
          'label', entry.label,
          'amount', entry.amount,
          'createdAt', entry.created_at,
          'createdByName', entry.created_by_name
        )
        order by entry.created_at
      )
        from (
          select op.id,
                 'sale' as kind,
                 'Pedido ' || o.number || coalesce(' · ' || o.customer_name, '') as label,
                 op.amount,
                 op.created_at,
                 coalesce(o.paid_by_operator_name, o.created_by_operator_name) as created_by_name
            from public.order_payments as op
            join public.orders as o on o.id = op.order_id
           where op.cash_session_id = p_session_id and op.method = 'cash'
          union all
          select ae.id,
                 'account_payment',
                 'Fiado · ' || ca.name,
                 ae.amount,
                 ae.created_at,
                 ae.operator_name
            from public.account_entries as ae
            join public.customer_accounts as ca on ca.id = ae.account_id
           where ae.cash_session_id = p_session_id
             and ae.kind = 'payment'
             and ae.payment_method = 'cash'
        ) as entry
    ), '[]'::jsonb),
    'supplies', m.supplies,
    'withdrawals', m.withdrawals,
    'expectedCash', coalesce(
      s.expected_cash,
      s.opening_amount + t.cash_received + m.supplies - m.withdrawals
    ),
    'payments', coalesce((
      select jsonb_agg(
        jsonb_build_object('method', method, 'amount', total, 'surcharge', surcharge, 'fee', fee)
        order by total desc
      )
        from (
          select
            method,
            sum(amount) as total,
            sum(surcharge) as surcharge,
            round(sum((amount + surcharge) * fee_percent / 100), 2) as fee
            from payments
           group by method
        ) as by_method
    ), '[]'::jsonb),
    'movements', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', cm.id,
          'kind', cm.kind,
          'amount', cm.amount,
          'note', cm.note,
          'createdAt', cm.created_at,
          'createdByName', cm.created_by_name
        )
        order by cm.created_at
      )
        from public.cash_movements as cm
       where cm.session_id = p_session_id
    ), '[]'::jsonb)
  )
    from session as s
    cross join totals as t
    cross join movement_totals as m;
$function$;
