alter table public.financial_entries
  add column counts_in_balance boolean not null default true;

create function public.reset_counts_in_balance_on_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.paid_at is distinct from old.paid_at then
    new.counts_in_balance := true;
  end if;
  return new;
end;
$$;

create trigger financial_entries_reset_counts_in_balance
  before update of paid_at on public.financial_entries
  for each row execute function public.reset_counts_in_balance_on_payment();

update public.financial_entries
   set counts_in_balance = false
 where organization_id = '0eebb1f0-9387-49cd-bc65-cf9ddd9d55f2'
   and paid_at is not null;

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
                 where e.account_id = a.id and e.paid_at is not null and e.paid_at <= v_today and e.counts_in_balance
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
         and counts_in_balance
    ), 0),
    'periodExpense', coalesce((
      select sum(paid_amount) from public.financial_entries
       where organization_id = p_organization_id and kind = 'expense'
         and paid_at between p_from and p_to
         and counts_in_balance
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

create or replace function public.get_financial_analysis(p_organization_id uuid, p_from date, p_to date, p_horizon_days integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_today date := public.organization_today(p_organization_id);
  v_timezone text;
  v_average_window_days constant integer := 28;
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_horizon_days not between 1 and 180 then
    raise exception 'invalid horizon' using errcode = '22023';
  end if;

  select timezone into v_timezone from public.organizations where id = p_organization_id;

  return jsonb_build_object(
    'today', v_today,
    'sales', (
      with month_orders as (
        select o.id, o.total
          from public.orders o
         where o.organization_id = p_organization_id
           and o.status <> 'canceled'
           and o.paid_at is not null
           and (o.paid_at at time zone v_timezone)::date between p_from and p_to
      )
      select jsonb_build_object(
        'revenue', coalesce((select sum(total) from month_orders), 0)
          - coalesce((
            select sum(op.amount)
              from public.order_payments op
              join month_orders mo on mo.id = op.order_id
             where op.method = 'customer_account'
          ), 0)
          + coalesce((
            select sum(e.amount)
              from public.account_entries e
             where e.organization_id = p_organization_id
               and e.kind = 'payment'
               and (e.created_at at time zone v_timezone)::date between p_from and p_to
          ), 0),
        'orderCount', (select count(*) from month_orders),
        'cost', coalesce((
          select sum(oi.quantity * oi.unit_cost)
            from public.order_items oi
            join month_orders mo on mo.id = oi.order_id
        ), 0),
        'itemsWithoutCost', (
          select count(*)
            from public.order_items oi
            join month_orders mo on mo.id = oi.order_id
           where coalesce(oi.unit_cost, 0) = 0
        )
      )
    ),
    'salesToday', coalesce((
      select sum(op.amount)
        from public.order_payments op
        join public.orders o on o.id = op.order_id
       where o.organization_id = p_organization_id
         and o.status <> 'canceled'
         and o.paid_at is not null
         and op.method <> 'customer_account'
         and (o.paid_at at time zone v_timezone)::date = v_today
    ), 0) + coalesce((
      select sum(e.amount)
        from public.account_entries e
       where e.organization_id = p_organization_id
         and e.kind = 'payment'
         and (e.created_at at time zone v_timezone)::date = v_today
    ), 0),
    'averageDailySales', coalesce((
      select sum(op.amount) / v_average_window_days
        from public.order_payments op
        join public.orders o on o.id = op.order_id
       where o.organization_id = p_organization_id
         and o.status <> 'canceled'
         and o.paid_at is not null
         and op.method <> 'customer_account'
         and (o.paid_at at time zone v_timezone)::date between v_today - v_average_window_days and v_today - 1
    ), 0),
    'expensesByCategory', coalesce((
      select jsonb_agg(jsonb_build_object('name', category_name, 'amount', amount) order by amount desc)
        from (
          select coalesce(c.name, 'Sem categoria') as category_name, sum(e.amount) as amount
            from public.financial_entries e
            left join public.financial_categories c on c.id = e.category_id
           where e.organization_id = p_organization_id
             and e.kind = 'expense'
             and e.due_date between p_from and p_to
           group by 1
        ) grouped
    ), '[]'::jsonb),
    'otherIncome', coalesce((
      select sum(e.amount)
        from public.financial_entries e
       where e.organization_id = p_organization_id
         and e.kind = 'income'
         and e.source = 'manual'
         and e.due_date between p_from and p_to
    ), 0),
    'balanceToday', coalesce((
      select sum(
        a.opening_balance
        + coalesce((
            select sum(case when e.kind = 'income' then e.paid_amount else -e.paid_amount end)
              from public.financial_entries e
             where e.account_id = a.id and e.paid_at is not null and e.paid_at <= v_today and e.counts_in_balance
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
        from public.financial_accounts a
       where a.organization_id = p_organization_id
         and not a.is_archived
    ), 0),
    'overdue', (
      select jsonb_build_object(
        'income', coalesce(sum(amount) filter (where kind = 'income'), 0),
        'expense', coalesce(sum(amount) filter (where kind = 'expense'), 0)
      )
        from public.financial_entries
       where organization_id = p_organization_id
         and paid_at is null
         and due_date < v_today
    ),
    'scheduled', coalesce((
      select jsonb_agg(
        jsonb_build_object('date', due_date, 'income', income, 'expense', expense)
        order by due_date
      )
        from (
          select due_date,
                 coalesce(sum(amount) filter (where kind = 'income'), 0) as income,
                 coalesce(sum(amount) filter (where kind = 'expense'), 0) as expense
            from public.financial_entries
           where organization_id = p_organization_id
             and paid_at is null
             and due_date between v_today and v_today + p_horizon_days
           group by due_date
        ) daily
    ), '[]'::jsonb)
  );
end;
$function$;
