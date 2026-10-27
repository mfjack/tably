alter table public.organizations
  add column balance_started_at timestamptz;

create function public.get_financial_account_balance(p_account_id uuid, p_today date)
returns numeric
language sql
stable
set search_path = ''
as $$
  with account as (
    select a.id, a.opening_balance,
           (o.balance_started_at at time zone o.timezone)::date as started_on
      from public.financial_accounts as a
      join public.organizations as o on o.id = a.organization_id
     where a.id = p_account_id
  )
  select account.opening_balance
    + coalesce((
        select sum(case when e.kind = 'income' then e.paid_amount else -e.paid_amount end)
          from public.financial_entries as e
         where e.account_id = account.id
           and e.paid_at is not null
           and e.paid_at <= p_today
           and e.counts_in_balance
           and (account.started_on is null or e.paid_at >= account.started_on)
      ), 0)
    + coalesce((
        select sum(t.amount)
          from public.financial_transfers as t
         where t.to_account_id = account.id
           and t.transferred_on <= p_today
           and (account.started_on is null or t.transferred_on >= account.started_on)
      ), 0)
    - coalesce((
        select sum(t.amount)
          from public.financial_transfers as t
         where t.from_account_id = account.id
           and t.transferred_on <= p_today
           and (account.started_on is null or t.transferred_on >= account.started_on)
      ), 0)
    from account;
$$;

revoke execute on function public.get_financial_account_balance from public, anon;
grant execute on function public.get_financial_account_balance to authenticated;

create function public.get_balance_sales_receipts(p_organization_id uuid, p_today date)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  with organization as (
    select timezone, balance_started_at from public.organizations where id = p_organization_id
  ),
  receipts as (
    select op.amount, op.surcharge, op.fee_percent, op.created_at
      from public.order_payments op
      join public.orders o on o.id = op.order_id
     where op.organization_id = p_organization_id
       and op.method <> 'customer_account'
       and o.status <> 'canceled'
    union all
    select ae.amount, ae.surcharge, ae.fee_percent, ae.created_at
      from public.account_entries ae
     where ae.organization_id = p_organization_id
       and ae.kind = 'payment'
  )
  select coalesce(round(sum((r.amount + r.surcharge) * (1 - r.fee_percent / 100)), 2), 0)
    from receipts r, organization
   where public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[])
     and (r.created_at at time zone organization.timezone)::date <= p_today
     and (organization.balance_started_at is null or r.created_at >= organization.balance_started_at);
$$;

revoke execute on function public.get_balance_sales_receipts from public, anon;
grant execute on function public.get_balance_sales_receipts to authenticated;

create function public.set_opening_balance(p_organization_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.financial_accounts
     set opening_balance = coalesce(p_amount, 0)
   where id = (
     select id from public.financial_accounts
      where organization_id = p_organization_id
        and not is_archived
      order by created_at
      limit 1
   );

  update public.organizations
     set balance_started_at = now()
   where id = p_organization_id;
end;
$$;

revoke execute on function public.set_opening_balance from public, anon;
grant execute on function public.set_opening_balance to authenticated;

create or replace function public.get_financial_overview(p_organization_id uuid, p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
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
          'balance', public.get_financial_account_balance(a.id, v_today)
        )
        order by a.is_archived, a.name
      )
        from public.financial_accounts a
       where a.organization_id = p_organization_id
    ), '[]'::jsonb),
    'salesBalance', public.get_balance_sales_receipts(p_organization_id, v_today),
    'pendingReceivables', public.get_pending_receivables(p_organization_id, v_today),
    'periodSales', public.get_sales_receipts(p_organization_id, p_from, p_to),
    'periodIncome', coalesce((
      select sum(paid_amount) from public.financial_entries
       where organization_id = p_organization_id and kind = 'income'
         and paid_at between p_from and p_to
         and counts_in_balance
    ), 0) + public.get_sales_receipts(p_organization_id, p_from, p_to),
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
$function$;

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
  v_open_weekdays integer[] := public.get_open_weekdays(p_organization_id);
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
    'openWeekdays', to_jsonb(v_open_weekdays),
    'averageDailySales', coalesce((
      select sum(sale.amount) / greatest((
          select count(*)
            from generate_series(min(sale.day), v_today - 1, interval '1 day') as day
           where cardinality(v_open_weekdays) = 0
              or extract(isodow from day)::integer = any (v_open_weekdays)
        ), 1)
        from (
          select op.amount, (o.paid_at at time zone v_timezone)::date as day
            from public.order_payments op
            join public.orders o on o.id = op.order_id
           where o.organization_id = p_organization_id
             and o.status <> 'canceled'
             and o.paid_at is not null
             and op.method <> 'customer_account'
             and (o.paid_at at time zone v_timezone)::date between v_today - v_average_window_days and v_today - 1
        ) as sale
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
      select sum(public.get_financial_account_balance(a.id, v_today))
        from public.financial_accounts a
       where a.organization_id = p_organization_id
         and not a.is_archived
    ), 0) + public.get_balance_sales_receipts(p_organization_id, v_today),
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
