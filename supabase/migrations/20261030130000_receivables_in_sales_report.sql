create or replace function public.get_sales_report(p_organization_id uuid, p_period public.sales_report_period)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_timezone text;
  v_today date;
  v_start date;
  v_end date;
  v_previous_start date;
  v_previous_end date;
  v_result jsonb;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  select timezone into v_timezone from public.organizations where id = p_organization_id;
  v_today := (now() at time zone v_timezone)::date;

  case p_period
    when 'today' then
      v_start := v_today;
      v_end := v_today;
    when 'yesterday' then
      v_start := v_today - 1;
      v_end := v_today - 1;
    when 'last_7_days' then
      v_start := v_today - 6;
      v_end := v_today;
    when 'last_30_days' then
      v_start := v_today - 29;
      v_end := v_today;
    when 'this_month' then
      v_start := date_trunc('month', v_today)::date;
      v_end := v_today;
    when 'last_month' then
      v_start := (date_trunc('month', v_today) - interval '1 month')::date;
      v_end := (date_trunc('month', v_today) - interval '1 day')::date;
  end case;

  if p_period in ('this_month', 'last_month') then
    v_previous_start := (v_start - interval '1 month')::date;
    v_previous_end := (v_end - interval '1 month')::date;
  else
    v_previous_start := v_start - (v_end - v_start + 1);
    v_previous_end := v_start - 1;
  end if;

  with paid_orders as (
    select
      o.id,
      o.total - coalesce((
        select sum(op.amount)
          from public.order_payments as op
         where op.order_id = o.id
           and op.method in ('customer_account', 'cash')
      ), 0) as total,
      o.takeaway_fee,
      o.loyalty_reward_amount,
      o.payment_method,
      o.paid_by_operator_name,
      (o.paid_at at time zone v_timezone)::date as paid_date,
      extract(hour from o.paid_at at time zone v_timezone)::integer as paid_hour,
      extract(isodow from o.paid_at at time zone v_timezone)::integer as paid_weekday
    from public.orders as o
    where o.organization_id = p_organization_id
      and o.paid_at is not null
      and o.status <> 'canceled'
      and (o.paid_at at time zone v_timezone)::date between v_previous_start and v_end
  ),
  account_receipts as (
    select
      e.amount as total,
      (e.created_at at time zone v_timezone)::date as paid_date,
      extract(hour from e.created_at at time zone v_timezone)::integer as paid_hour,
      extract(isodow from e.created_at at time zone v_timezone)::integer as paid_weekday
    from public.account_entries as e
    where e.organization_id = p_organization_id
      and e.kind = 'payment'
      and e.payment_method <> 'cash'
      and (e.created_at at time zone v_timezone)::date between v_previous_start and v_end
  ),
  current_orders as (
    select * from paid_orders where paid_date between v_start and v_end
  ),
  sold_orders as (
    select * from current_orders where total > 0
  ),
  current_sales as (
    select total, paid_date, paid_hour, paid_weekday from sold_orders
    union all
    select total, paid_date, paid_hour, paid_weekday from account_receipts
     where paid_date between v_start and v_end
  ),
  previous_sales as (
    select total from paid_orders
     where paid_date between v_previous_start and v_previous_end
       and total > 0
    union all
    select total from account_receipts
     where paid_date between v_previous_start and v_previous_end
  ),
  current_payments as (
    select op.order_id, op.method as payment_method, op.amount, op.surcharge, (op.amount + op.surcharge) * op.fee_percent / 100 as fee, co.paid_by_operator_name
      from public.order_payments as op
      join current_orders as co on co.id = op.order_id
  ),
  current_items as (
    select oi.order_id, oi.product_id, oi.product_name, oi.quantity, oi.unit_price, oi.unit_cost
      from public.order_items as oi
      join sold_orders as co on co.id = oi.order_id
  ),
  sold_products as (
    select
      product_id,
      max(product_name) as product_name,
      sum(quantity) as quantity,
      sum(quantity * unit_price) as revenue,
      sum(quantity * unit_cost) as cost,
      count(distinct order_id) as order_count
    from current_items
    group by product_id, case when product_id is null then product_name end
  ),
  report_products as (
    select
      sp.product_id,
      coalesce(p.name, sp.product_name) as product_name,
      c.name as category_name,
      sp.quantity,
      sp.revenue,
      sp.cost,
      sp.order_count
    from sold_products as sp
    left join public.products as p on p.id = sp.product_id
    left join public.categories as c on c.id = p.category_id
    union all
    select p.id, p.name, c.name, 0, 0, 0, 0
      from public.products as p
      left join public.categories as c on c.id = p.category_id
     where p.organization_id = p_organization_id
       and p.is_active
       and not exists (select 1 from sold_products as sp where sp.product_id = p.id)
  )
  select jsonb_build_object(
    'start_date', v_start,
    'end_date', v_end,
    'summary', (
      select jsonb_build_object(
        'revenue', (select coalesce(sum(total), 0) from current_sales),
        'order_count', (select count(*) from current_sales),
        'takeaway_fees', coalesce(sum(takeaway_fee), 0),
        'cost', (select coalesce(sum(quantity * unit_cost), 0) from current_items),
        'item_count', (select coalesce(sum(quantity), 0) from current_items)
      )
      from sold_orders
    ),
    'loyalty', jsonb_build_object(
      'stamps_given', (
        select coalesce(sum(t.stamps), 0)
          from public.loyalty_transactions as t
         where t.organization_id = p_organization_id
           and t.kind = 'earn'
           and (t.created_at at time zone v_timezone)::date between v_start and v_end
      ),
      'rewards_redeemed', (
        select count(*)
          from public.loyalty_transactions as t
         where t.organization_id = p_organization_id
           and t.kind = 'redeem'
           and (t.created_at at time zone v_timezone)::date between v_start and v_end
      ),
      'reward_cost', (select coalesce(sum(loyalty_reward_amount), 0) from current_orders),
      'active_customers', (
        select count(distinct t.customer_id)
          from public.loyalty_transactions as t
         where t.organization_id = p_organization_id
           and t.kind in ('earn', 'redeem')
           and (t.created_at at time zone v_timezone)::date between v_start and v_end
      ),
      'new_customers', (
        select count(*)
          from public.loyalty_customers as c
         where c.organization_id = p_organization_id
           and (c.created_at at time zone v_timezone)::date between v_start and v_end
      )
    ),
    'previous_summary', (
      select jsonb_build_object(
        'revenue', coalesce(sum(total), 0),
        'order_count', count(*)
      )
      from previous_sales
    ),
    'canceled', (
      select jsonb_build_object(
        'order_count', count(*),
        'total', coalesce(sum(o.total), 0)
      )
      from public.orders as o
      where o.organization_id = p_organization_id
        and o.status = 'canceled'
        and (o.created_at at time zone v_timezone)::date between v_start and v_end
    ),
    'by_payment_method', (
      select coalesce(jsonb_agg(
        jsonb_build_object('method', payment_method, 'revenue', revenue, 'fee', fee, 'surcharge', surcharge, 'order_count', order_count)
        order by revenue desc
      ), '[]'::jsonb)
      from (
        select payment_method, sum(amount) as revenue, round(sum(fee), 2) as fee, sum(surcharge) as surcharge, count(distinct order_id) as order_count
          from current_payments
         group by payment_method
      ) as payments
    ),
    'by_operator_payment', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'operator_name', paid_by_operator_name,
          'method', payment_method,
          'revenue', revenue,
          'order_count', order_count
        )
      ), '[]'::jsonb)
      from (
        select paid_by_operator_name, payment_method, sum(amount) as revenue, count(distinct order_id) as order_count
          from current_payments
         group by paid_by_operator_name, payment_method
      ) as operator_payments
    ),
    'account_receipts', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'operator_name', operator_name,
          'method', payment_method,
          'revenue', amount,
          'fee', fee,
          'surcharge', surcharge,
          'order_count', receipt_count
        )
      ), '[]'::jsonb)
      from (
        select
          e.operator_name,
          e.payment_method,
          sum(e.amount) as amount,
          round(sum((e.amount + e.surcharge) * e.fee_percent / 100), 2) as fee,
          sum(e.surcharge) as surcharge,
          count(*) as receipt_count
          from public.account_entries as e
         where e.organization_id = p_organization_id
           and e.kind = 'payment'
           and (e.created_at at time zone v_timezone)::date between v_start and v_end
         group by e.operator_name, e.payment_method
      ) as receipts
    ),
    'by_hour', (
      select coalesce(jsonb_agg(
        jsonb_build_object('hour', paid_hour, 'revenue', revenue, 'order_count', order_count)
        order by paid_hour
      ), '[]'::jsonb)
      from (
        select paid_hour, sum(total) as revenue, count(*) as order_count
          from current_sales
         group by paid_hour
      ) as hourly
    ),
    'by_weekday', (
      select jsonb_agg(
        jsonb_build_object(
          'weekday', weekday,
          'revenue', coalesce(weekly.revenue, 0),
          'order_count', coalesce(weekly.order_count, 0)
        )
        order by weekday
      )
      from generate_series(1, 7) as weekday
      left join (
        select paid_weekday, sum(total) as revenue, count(*) as order_count
          from current_sales
         group by paid_weekday
      ) as weekly on weekly.paid_weekday = weekday
    ),
    'by_day', (
      select jsonb_agg(
        jsonb_build_object(
          'date', day::date,
          'revenue', coalesce(daily.revenue, 0),
          'order_count', coalesce(daily.order_count, 0)
        )
        order by day
      )
      from generate_series(v_start, v_end, interval '1 day') as day
      left join (
        select paid_date, sum(total) as revenue, count(*) as order_count
          from current_sales
         group by paid_date
      ) as daily on daily.paid_date = day::date
    ),
    'pending_receivables', case
      when public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[])
        then public.get_pending_receivables(p_organization_id, v_today)
          || jsonb_build_object('today', v_today)
    end,
    'products', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'product_id', product_id,
          'product_name', product_name,
          'category_name', category_name,
          'quantity', quantity,
          'revenue', revenue,
          'cost', cost,
          'order_count', order_count
        )
        order by quantity desc, revenue desc, product_name
      ), '[]'::jsonb)
      from report_products
    )
  )
  into v_result;

  return v_result;
end;
$function$;

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
