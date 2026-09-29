alter table public.order_items
  add column unit_cost numeric(14, 4) not null default 0 check (unit_cost >= 0);

update public.order_items as oi
   set unit_cost = pc.unit_cost
  from public.product_costs as pc
 where pc.product_id = oi.product_id;

create function public.set_order_item_unit_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.product_id is not null then
    select pc.unit_cost into new.unit_cost
      from public.product_costs as pc
     where pc.product_id = new.product_id;
    new.unit_cost := coalesce(new.unit_cost, 0);
  end if;
  return new;
end;
$$;

create trigger order_items_unit_cost
  before insert on public.order_items
  for each row execute function public.set_order_item_unit_cost();

create type public.sales_report_period as enum (
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'this_month',
  'last_month'
);

create function public.get_sales_report(
  p_organization_id uuid,
  p_period public.sales_report_period
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
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
      o.payment_method,
      (o.paid_at at time zone v_timezone)::date as paid_date
    from public.orders as o
    where o.organization_id = p_organization_id
      and o.paid_at is not null
      and o.status <> 'canceled'
      and (o.paid_at at time zone v_timezone)::date between v_previous_start and v_end
  ),
  current_orders as (
    select * from paid_orders where paid_date between v_start and v_end
  ),
  previous_orders as (
    select * from paid_orders where paid_date between v_previous_start and v_previous_end
  ),
  current_items as (
    select oi.product_name, oi.quantity, oi.unit_price, oi.unit_cost
      from public.order_items as oi
      join current_orders as co on co.id = oi.order_id
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
    'previous_summary', (
      select jsonb_build_object(
        'revenue', coalesce(sum(total), 0),
        'order_count', count(*)
      )
      from previous_orders
    ),
    'by_payment_method', (
      select coalesce(jsonb_agg(
        jsonb_build_object('method', payment_method, 'revenue', revenue, 'order_count', order_count)
        order by revenue desc
      ), '[]'::jsonb)
      from (
        select payment_method, sum(total) as revenue, count(*) as order_count
          from current_orders
         group by payment_method
      ) as payments
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
    'top_products', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'product_name', product_name,
          'quantity', quantity,
          'revenue', revenue,
          'cost', cost
        )
        order by quantity desc, revenue desc
      ), '[]'::jsonb)
      from (
        select
          product_name,
          sum(quantity) as quantity,
          sum(quantity * unit_price) as revenue,
          sum(quantity * unit_cost) as cost
        from current_items
        group by product_name
        order by sum(quantity) desc, sum(quantity * unit_price) desc
        limit 10
      ) as products
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_sales_report from public, anon;
grant execute on function public.get_sales_report to authenticated;
