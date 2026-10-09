create or replace function public.get_financial_overview(
  p_organization_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_today date := public.organization_today(p_organization_id);
  v_overdue_cutoff date;
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  v_overdue_cutoff := case when v_today between p_from and p_to then v_today else p_from end;

  return jsonb_build_object(
    'today', v_today,
    'firstMonthKey', to_char(least(
      v_today,
      (select min(due_date) from public.financial_entries where organization_id = p_organization_id),
      (select min(paid_at) from public.financial_entries where organization_id = p_organization_id)
    ), 'YYYY-MM'),
    'accounts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'kind', a.kind,
          'isArchived', a.is_archived,
          'balance', a.opening_balance
            + coalesce((
                select sum(case when e.kind = 'income' then e.paid_amount else -e.paid_amount end)
                  from public.financial_entries e
                 where e.account_id = a.id and e.paid_at is not null and e.paid_at <= v_today
              ), 0)
            + coalesce((
                select sum(t.amount) from public.financial_transfers t
                 where t.to_account_id = a.id and t.transferred_on <= v_today
              ), 0)
            - coalesce((
                select sum(t.amount) from public.financial_transfers t
                 where t.from_account_id = a.id and t.transferred_on <= v_today
              ), 0)
        )
        order by a.is_archived, a.name
      )
        from public.financial_accounts a
       where a.organization_id = p_organization_id
    ), '[]'::jsonb),
    'periodIncome', coalesce((
      select sum(paid_amount) from public.financial_entries
       where organization_id = p_organization_id and kind = 'income'
         and paid_at between p_from and p_to
    ), 0),
    'periodExpense', coalesce((
      select sum(paid_amount) from public.financial_entries
       where organization_id = p_organization_id and kind = 'expense'
         and paid_at between p_from and p_to
    ), 0),
    'overduePayables', (
      select jsonb_build_object('count', count(*), 'amount', coalesce(sum(amount), 0))
        from public.financial_entries
       where organization_id = p_organization_id and kind = 'expense'
         and paid_at is null and due_date < v_overdue_cutoff
    ),
    'overdueReceivables', (
      select jsonb_build_object('count', count(*), 'amount', coalesce(sum(amount), 0))
        from public.financial_entries
       where organization_id = p_organization_id and kind = 'income'
         and paid_at is null and due_date < v_overdue_cutoff
    ),
    'monthPayables', (
      select jsonb_build_object('count', count(*), 'amount', coalesce(sum(amount), 0))
        from public.financial_entries
       where organization_id = p_organization_id and kind = 'expense'
         and paid_at is null and due_date between p_from and p_to
    ),
    'monthReceivables', (
      select jsonb_build_object('count', count(*), 'amount', coalesce(sum(amount), 0))
        from public.financial_entries
       where organization_id = p_organization_id and kind = 'income'
         and paid_at is null and due_date between p_from and p_to
    ),
    'monthFixedExpenses', (
      select jsonb_build_object(
        'count', count(*),
        'amount', coalesce(sum(amount), 0),
        'paidAmount', coalesce(sum(paid_amount) filter (where paid_at is not null), 0),
        'openCount', count(*) filter (where paid_at is null)
      )
        from public.financial_entries
       where organization_id = p_organization_id and kind = 'expense'
         and recurrence_id is not null and due_date between p_from and p_to
    )
  );
end;
$$;
