alter table public.account_entries
  add column fee_percent numeric(5, 2) not null default 0 check (fee_percent between 0 and 100),
  add column surcharge numeric(12, 2) not null default 0 check (surcharge >= 0);

create function public.get_payment_fee_percent(p_organization_id uuid, p_method public.payment_method)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case p_method
             when 'credit_card' then o.credit_card_fee_percent
             when 'debit_card' then o.debit_card_fee_percent
             when 'pix' then o.pix_fee_percent
             else 0
           end
      from public.organizations as o
     where o.id = p_organization_id
  ), 0);
$$;

revoke execute on function public.get_payment_fee_percent from public, anon, authenticated;

create function public.get_payment_surcharge(
  p_organization_id uuid,
  p_fee_percent numeric,
  p_amount numeric
)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_fee_percent > 0 and p_fee_percent < 100 and exists (
      select 1 from public.organizations
       where id = p_organization_id and is_card_fee_passed_on
    )
      then round(p_amount / (1 - p_fee_percent / 100) - p_amount, 2)
    else 0
  end;
$$;

revoke execute on function public.get_payment_surcharge from public, anon, authenticated;

create or replace function public.set_order_payment_fee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.fee_percent := public.get_payment_fee_percent(new.organization_id, new.method);
  new.surcharge := public.get_payment_surcharge(new.organization_id, new.fee_percent, new.amount);
  return new;
end;
$$;

create function public.set_account_payment_fee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'payment' and new.payment_method is not null then
    new.fee_percent := public.get_payment_fee_percent(new.organization_id, new.payment_method);
    new.surcharge := public.get_payment_surcharge(new.organization_id, new.fee_percent, new.amount);
  end if;
  return new;
end;
$$;

revoke execute on function public.set_account_payment_fee from public, anon, authenticated;

create trigger account_entries_set_fee
  before insert on public.account_entries
  for each row execute function public.set_account_payment_fee();

create or replace function public.build_cash_session_summary(p_session_id uuid)
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
      o.total,
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
  current_orders as (
    select * from paid_orders where paid_date between v_start and v_end
  ),
  current_payments as (
    select op.order_id, op.method as payment_method, op.amount, op.surcharge, (op.amount + op.surcharge) * op.fee_percent / 100 as fee, co.paid_by_operator_name
      from public.order_payments as op
      join current_orders as co on co.id = op.order_id
  ),
  previous_orders as (
    select * from paid_orders where paid_date between v_previous_start and v_previous_end
  ),
  current_items as (
    select oi.order_id, oi.product_id, oi.product_name, oi.quantity, oi.unit_price, oi.unit_cost
      from public.order_items as oi
      join current_orders as co on co.id = oi.order_id
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
        'revenue', coalesce(sum(total), 0),
        'order_count', count(*),
        'takeaway_fees', coalesce(sum(takeaway_fee), 0),
        'cost', (select coalesce(sum(quantity * unit_cost), 0) from current_items),
        'item_count', (select coalesce(sum(quantity), 0) from current_items)
      )
      from current_orders
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
      from previous_orders
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
          from current_orders
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
          from current_orders
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
          from current_orders
         group by paid_date
      ) as daily on daily.paid_date = day::date
    ),
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
