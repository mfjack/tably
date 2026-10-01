create table public.order_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null,
  method public.payment_method not null,
  amount numeric(12, 2) not null check (amount > 0),
  amount_received numeric(12, 2) check (amount_received is null or amount_received >= amount),
  customer_account_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (order_id, organization_id)
    references public.orders (id, organization_id) on delete cascade
);

create index order_payments_order_id_idx on public.order_payments (order_id);
create index order_payments_organization_id_idx on public.order_payments (organization_id);

alter table public.order_payments enable row level security;

create policy "order_payments: members read" on public.order_payments
  for select to authenticated using (public.is_member(organization_id));

insert into public.order_payments (
  organization_id, order_id, method, amount, amount_received,
  customer_account_id, created_by, created_at
)
select
  o.organization_id,
  o.id,
  o.payment_method,
  o.total,
  case when o.payment_method = 'cash' and o.amount_received >= o.total then o.amount_received end,
  o.customer_account_id,
  o.paid_by,
  o.paid_at
  from public.orders as o
 where o.paid_at is not null
   and o.payment_method is not null
   and o.total > 0;

create function public.normalize_order_payments(
  p_payments jsonb,
  p_payment_method public.payment_method,
  p_amount_received numeric,
  p_customer_account_id uuid
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when p_payments is not null and jsonb_array_length(p_payments) > 0 then p_payments
    when p_payment_method is not null then jsonb_build_array(jsonb_build_object(
      'method', p_payment_method,
      'amount_received', p_amount_received,
      'customer_account_id', p_customer_account_id
    ))
  end;
$$;

revoke execute on function public.normalize_order_payments from public, anon, authenticated;

create function public.record_order_payments(
  p_organization_id uuid,
  p_order_id uuid,
  p_payments jsonb,
  p_total numeric,
  p_paid_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment jsonb;
  v_payment_count integer := jsonb_array_length(p_payments);
  v_method public.payment_method;
  v_amount numeric(12, 2);
  v_amount_received numeric(12, 2);
  v_paid_total numeric(12, 2) := 0;
  v_cash_received numeric(12, 2);
  v_primary_method public.payment_method;
  v_primary_amount numeric(12, 2) := 0;
begin
  if coalesce(v_payment_count, 0) = 0 then
    raise exception 'payment is required' using errcode = '22023';
  end if;

  for v_payment in select value from jsonb_array_elements(p_payments) loop
    v_method := (v_payment ->> 'method')::public.payment_method;
    v_amount := coalesce(
      (v_payment ->> 'amount')::numeric,
      case when v_payment_count = 1 then p_total end
    );

    if v_method is null or v_amount is null or v_amount <= 0 then
      raise exception 'invalid payment' using errcode = '22023';
    end if;

    v_amount_received := null;
    if v_method = 'cash' then
      v_amount_received := coalesce((v_payment ->> 'amount_received')::numeric, v_amount);
      if v_amount_received < v_amount then
        raise exception 'amount received is lower than total' using errcode = '22023';
      end if;
      v_cash_received := coalesce(v_cash_received, 0) + v_amount_received;
    end if;

    insert into public.order_payments (
      organization_id, order_id, method, amount, amount_received, customer_account_id, created_at
    )
    values (
      p_organization_id,
      p_order_id,
      v_method,
      v_amount,
      v_amount_received,
      case when v_method = 'customer_account' then nullif(v_payment ->> 'customer_account_id', '')::uuid end,
      p_paid_at
    );

    if v_method = 'customer_account' then
      perform public.charge_customer_account(
        p_organization_id,
        nullif(v_payment ->> 'customer_account_id', '')::uuid,
        p_order_id,
        v_amount
      );
    end if;

    v_paid_total := v_paid_total + v_amount;
    if v_amount > v_primary_amount then
      v_primary_method := v_method;
      v_primary_amount := v_amount;
    end if;
  end loop;

  if v_paid_total <> p_total then
    raise exception 'payments do not match total' using errcode = 'TB006';
  end if;

  update public.orders
     set payment_method = v_primary_method,
         amount_received = v_cash_received,
         paid_at = p_paid_at,
         paid_by = auth.uid()
   where id = p_order_id;
end;
$$;

revoke execute on function public.record_order_payments from public, anon, authenticated;

drop function public.place_order(uuid, jsonb, text, public.payment_method, numeric, text, boolean, boolean, uuid, uuid, timestamptz);

create function public.place_order(
  p_organization_id uuid,
  p_items jsonb,
  p_note text default null,
  p_payment_method public.payment_method default null,
  p_amount_received numeric default null,
  p_customer_name text default null,
  p_is_takeaway boolean default false,
  p_send_to_kitchen boolean default true,
  p_customer_account_id uuid default null,
  p_request_id uuid default null,
  p_placed_at timestamptz default null,
  p_payments jsonb default null
)
returns table (order_id uuid, order_number integer, order_total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_number integer;
  v_subtotal numeric(12, 2);
  v_takeaway_fee numeric(12, 2) := 0;
  v_total numeric(12, 2);
  v_item_count integer;
  v_valid_item_count integer;
  v_items jsonb;
  v_is_takeaway boolean := false;
  v_payments jsonb := public.normalize_order_payments(
    p_payments, p_payment_method, p_amount_received, p_customer_account_id
  );
  v_is_open boolean;
  v_is_offline boolean := p_placed_at is not null;
  v_placed_at timestamptz := least(coalesce(p_placed_at, now()), now());
  v_customer_name text := nullif(trim(p_customer_name), '');
  v_ticket_id uuid;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  v_is_open := coalesce(p_send_to_kitchen, true) or v_payments is null;

  if p_request_id is not null then
    perform pg_advisory_xact_lock(hashtext(p_request_id::text));

    if exists (
      select 1 from public.order_requests
       where id = p_request_id and organization_id <> p_organization_id
    ) then
      raise exception 'offline request belongs to another organization' using errcode = '42501';
    end if;

    return query
      select o.id, o.number, o.total
        from public.order_requests as r
        join public.orders as o on o.id = r.order_id
       where r.id = p_request_id;
    if found then
      return;
    end if;
  end if;

  drop table if exists requested_items;

  create temporary table requested_items on commit drop as
  select
    (item ->> 'product_id')::uuid as product_id,
    nullif(left(trim(item ->> 'note'), 140), '') as note,
    sum((item ->> 'quantity')::integer) as quantity
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  group by 1, 2;

  select count(*) into v_item_count from requested_items;

  if v_item_count = 0 then
    raise exception 'order has no items' using errcode = '22023';
  end if;

  if exists (select 1 from requested_items where quantity is null or quantity <= 0) then
    raise exception 'invalid item quantity' using errcode = '22023';
  end if;

  select count(*), coalesce(sum(p.price * requested.quantity), 0)
    into v_valid_item_count, v_subtotal
    from requested_items as requested
    join public.products as p
      on p.id = requested.product_id
     and p.organization_id = p_organization_id
     and (p.is_active or v_is_offline);

  if v_valid_item_count <> v_item_count then
    raise exception 'unavailable product in order' using errcode = 'P0002';
  end if;

  select coalesce(p_is_takeaway, false) and o.is_takeaway_enabled
    into v_is_takeaway
    from public.organizations as o
   where o.id = p_organization_id;

  if v_is_takeaway then
    select takeaway_fee into v_takeaway_fee
      from public.organizations
     where id = p_organization_id;
  end if;

  v_total := v_subtotal + v_takeaway_fee;

  if v_is_open and v_customer_name is not null then
    if v_is_offline then
      v_customer_name := public.resolve_offline_customer_name(p_organization_id, v_customer_name);
    else
      perform pg_advisory_xact_lock(
        hashtext(p_organization_id::text || ':' || lower(v_customer_name))
      );

      if public.is_customer_name_in_use(p_organization_id, v_customer_name) then
        raise exception 'customer name already in use' using errcode = 'TB002';
      end if;
    end if;
  end if;

  update public.organizations
     set last_order_number = last_order_number + 1
   where id = p_organization_id
  returning last_order_number into v_order_number;

  insert into public.orders (
    organization_id, number, status, note, customer_name, is_takeaway,
    subtotal, takeaway_fee, total, created_at
  )
  values (
    p_organization_id,
    v_order_number,
    case when v_is_open then 'in_kitchen' else 'completed' end::public.order_status,
    nullif(trim(p_note), ''),
    v_customer_name,
    v_is_takeaway,
    v_subtotal,
    v_takeaway_fee,
    v_total,
    v_placed_at
  )
  returning id into v_order_id;

  if v_payments is not null then
    perform public.record_order_payments(p_organization_id, v_order_id, v_payments, v_total, v_placed_at);
  end if;

  insert into public.order_items (
    organization_id, order_id, product_id, product_name, quantity, unit_price, note
  )
  select p_organization_id, v_order_id, p.id, p.name, requested.quantity, p.price, requested.note
    from requested_items as requested
    join public.products as p on p.id = requested.product_id;

  select jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity, 'note', note))
    into v_items
    from requested_items;

  if coalesce(p_send_to_kitchen, true) then
    v_ticket_id := public.create_kitchen_ticket(p_organization_id, v_order_id, v_items, p_note, false);

    if v_is_offline then
      perform public.deliver_offline_kitchen_ticket(v_ticket_id, v_placed_at);
      perform public.complete_order_if_done(v_order_id);
    end if;
  end if;

  perform public.move_order_stock(p_organization_id, v_order_id, v_items, false, v_is_offline);

  if p_request_id is not null then
    insert into public.order_requests (id, organization_id, order_id)
    values (p_request_id, p_organization_id, v_order_id);
  end if;

  return query select v_order_id, v_order_number, v_total;
end;
$$;

revoke execute on function public.place_order from public, anon;
grant execute on function public.place_order to authenticated;

drop function public.pay_order(uuid, public.payment_method, numeric, uuid);

create function public.pay_order(
  p_order_id uuid,
  p_payment_method public.payment_method default null,
  p_amount_received numeric default null,
  p_customer_account_id uuid default null,
  p_payments jsonb default null
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_payments jsonb := public.normalize_order_payments(
    p_payments, p_payment_method, p_amount_received, p_customer_account_id
  );
begin
  v_order := public.lock_open_order(p_order_id);

  if not exists (select 1 from public.order_items where order_id = p_order_id) then
    raise exception 'order has no items' using errcode = '22023';
  end if;

  if v_payments is null then
    raise exception 'payment is required' using errcode = '22023';
  end if;

  perform public.record_order_payments(v_order.organization_id, p_order_id, v_payments, v_order.total, now());
  perform public.complete_order_if_done(p_order_id);

  return v_order.total;
end;
$$;

revoke execute on function public.pay_order from public, anon;
grant execute on function public.pay_order to authenticated;

CREATE OR REPLACE FUNCTION public.get_sales_report(p_organization_id uuid, p_period sales_report_period)
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
    select op.order_id, op.method as payment_method, op.amount, co.paid_by_operator_name
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
        jsonb_build_object('method', payment_method, 'revenue', revenue, 'order_count', order_count)
        order by revenue desc
      ), '[]'::jsonb)
      from (
        select payment_method, sum(amount) as revenue, count(distinct order_id) as order_count
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
          'order_count', receipt_count
        )
      ), '[]'::jsonb)
      from (
        select e.operator_name, e.payment_method, sum(e.amount) as amount, count(*) as receipt_count
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

CREATE OR REPLACE FUNCTION public.get_financial_analysis(p_organization_id uuid, p_from date, p_to date, p_horizon_days integer)
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
        'revenue', coalesce((select sum(total) from month_orders), 0),
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
      select sum(o.total)
        from public.orders o
       where o.organization_id = p_organization_id
         and o.status <> 'canceled'
         and o.paid_at is not null
         and (o.paid_at at time zone v_timezone)::date = v_today
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

CREATE OR REPLACE FUNCTION public.sync_financial_automations(p_organization_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_settings public.finance_automation_settings;
  v_today date;
  v_timezone text;
  v_from date;
  v_sales_category uuid;
  v_customer_category uuid;
  v_fee_category uuid;
  v_stock_category uuid;
  v_payroll_category uuid;
  v_tax_category uuid;
  v_row record;
  v_keys text[] := '{}';
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_settings
    from public.finance_automation_settings
   where organization_id = p_organization_id;

  if not found then
    return;
  end if;

  v_today := public.organization_today(p_organization_id);
  select timezone into v_timezone from public.organizations where id = p_organization_id;
  v_from := greatest(v_settings.start_date, v_today - 62);

  select id into v_sales_category from public.financial_categories
   where organization_id = p_organization_id and kind = 'income' and name = 'Vendas' limit 1;
  select id into v_customer_category from public.financial_categories
   where organization_id = p_organization_id and kind = 'income' and name = 'Recebimento de fiado' limit 1;
  select id into v_fee_category from public.financial_categories
   where organization_id = p_organization_id and kind = 'expense' and name = 'Taxas de cartão' limit 1;
  select id into v_stock_category from public.financial_categories
   where organization_id = p_organization_id and kind = 'expense' and name = 'Insumos e mercadorias' limit 1;
  select id into v_payroll_category from public.financial_categories
   where organization_id = p_organization_id and kind = 'expense' and name = 'Salários e encargos' limit 1;
  v_tax_category := v_payroll_category;

  if v_settings.is_sales_enabled then
    for v_row in
      with daily as (
        select (o.paid_at at time zone v_timezone)::date as day,
               op.method as payment_method,
               sum(op.amount) as total
          from public.order_payments op
          join public.orders o on o.id = op.order_id
         where o.organization_id = p_organization_id
           and o.status <> 'canceled'
           and o.paid_at is not null
           and op.method in ('cash', 'pix', 'credit_card', 'debit_card')
           and (o.paid_at at time zone v_timezone)::date between v_from and v_today
         group by 1, 2
      )
      select d.*, s.account_id, coalesce(s.fee_percent, 0) as fee_percent,
             coalesce(s.settlement_days, 0) as settlement_days
        from daily d
        left join public.finance_payment_method_settings s
          on s.organization_id = p_organization_id and s.payment_method = d.payment_method
    loop
      v_keys := v_keys || ('sales:' || v_row.day || ':' || v_row.payment_method);
      perform public.upsert_automatic_entry(
        p_organization_id, 'sales', 'sales:' || v_row.day || ':' || v_row.payment_method, v_row.day,
        'income', 'Vendas ' || to_char(v_row.day, 'DD/MM') || ' · ' || public.payment_method_label(v_row.payment_method),
        v_row.total, v_row.day + v_row.settlement_days, v_sales_category, v_row.account_id, null,
        v_today, false
      );

      v_keys := v_keys || ('sales-fee:' || v_row.day || ':' || v_row.payment_method);
      perform public.upsert_automatic_entry(
        p_organization_id, 'sales_fee', 'sales-fee:' || v_row.day || ':' || v_row.payment_method, v_row.day,
        'expense', 'Taxa ' || public.payment_method_label(v_row.payment_method) || ' · vendas ' || to_char(v_row.day, 'DD/MM'),
        round(v_row.total * v_row.fee_percent / 100, 2), v_row.day + v_row.settlement_days,
        v_fee_category, v_row.account_id, null, v_today, false
      );
    end loop;
  end if;

  if v_settings.is_customer_payments_enabled then
    for v_row in
      with daily as (
        select (e.created_at at time zone v_timezone)::date as day,
               e.payment_method,
               sum(e.amount) as total
          from public.account_entries e
         where e.organization_id = p_organization_id
           and e.kind = 'payment'
           and e.payment_method in ('cash', 'pix', 'credit_card', 'debit_card')
           and (e.created_at at time zone v_timezone)::date between v_from and v_today
         group by 1, 2
      )
      select d.*, s.account_id, coalesce(s.fee_percent, 0) as fee_percent,
             coalesce(s.settlement_days, 0) as settlement_days
        from daily d
        left join public.finance_payment_method_settings s
          on s.organization_id = p_organization_id and s.payment_method = d.payment_method
    loop
      v_keys := v_keys || ('customer-payments:' || v_row.day || ':' || v_row.payment_method);
      perform public.upsert_automatic_entry(
        p_organization_id, 'customer_payments', 'customer-payments:' || v_row.day || ':' || v_row.payment_method,
        v_row.day, 'income',
        'Fiado recebido ' || to_char(v_row.day, 'DD/MM') || ' · ' || public.payment_method_label(v_row.payment_method),
        v_row.total, v_row.day + v_row.settlement_days, v_customer_category, v_row.account_id, null,
        v_today, false
      );

      v_keys := v_keys || ('customer-payments-fee:' || v_row.day || ':' || v_row.payment_method);
      perform public.upsert_automatic_entry(
        p_organization_id, 'customer_payments_fee', 'customer-payments-fee:' || v_row.day || ':' || v_row.payment_method,
        v_row.day, 'expense',
        'Taxa ' || public.payment_method_label(v_row.payment_method) || ' · fiado ' || to_char(v_row.day, 'DD/MM'),
        round(v_row.total * v_row.fee_percent / 100, 2), v_row.day + v_row.settlement_days,
        v_fee_category, v_row.account_id, null, v_today, false
      );
    end loop;
  end if;

  delete from public.financial_entries
   where organization_id = p_organization_id
     and source in ('sales', 'sales_fee', 'customer_payments', 'customer_payments_fee')
     and source_date between v_from and v_today
     and source_key <> all (v_keys);

  if v_settings.is_stock_purchases_enabled then
    for v_row in
      select se.id,
             (se.entered_at at time zone v_timezone)::date as day,
             se.total_cost,
             se.supplier_id,
             i.name as ingredient_name
        from public.stock_entries se
        join public.ingredients i on i.id = se.ingredient_id
       where se.organization_id = p_organization_id
         and (se.entered_at at time zone v_timezone)::date between v_from and v_today
    loop
      perform public.upsert_automatic_entry(
        p_organization_id, 'stock_purchase', 'stock:' || v_row.id, v_row.day, 'expense',
        'Compra de ' || v_row.ingredient_name, v_row.total_cost, v_row.day, v_stock_category,
        v_settings.stock_purchase_account_id, v_row.supplier_id, v_today, true
      );
    end loop;

    delete from public.financial_entries fe
     where fe.organization_id = p_organization_id
       and fe.source = 'stock_purchase'
       and fe.paid_at is null
       and not exists (
         select 1 from public.stock_entries se
          where 'stock:' || se.id = fe.source_key
       );
  end if;

  if v_settings.is_payroll_enabled then
    for v_row in
      select p.id, p.reference_month, p.net_amount, p.kind, p.payment_due_date,
             p.employee_snapshot ->> 'name' as employee_name
        from public.payslips p
       where p.organization_id = p_organization_id
         and p.status = 'issued'
         and p.reference_month >= date_trunc('month', v_settings.start_date)::date - interval '1 month'
    loop
      perform public.upsert_automatic_entry(
        p_organization_id, 'payroll_salary', 'payroll-salary:' || v_row.id, v_row.reference_month,
        'expense',
        case v_row.kind
          when 'vacation' then 'Férias ' || v_row.employee_name
          when 'thirteenth_first' then '13º salário (1ª parcela) ' || v_row.employee_name
          when 'thirteenth_second' then '13º salário (2ª parcela) ' || v_row.employee_name
          else 'Salário ' || v_row.employee_name || ' · ' || to_char(v_row.reference_month, 'MM/YYYY')
        end,
        v_row.net_amount,
        coalesce(
          v_row.payment_due_date,
          public.nth_business_day(p_organization_id, (v_row.reference_month + interval '1 month')::date, 5)
        ),
        v_payroll_category, null, null, null, true
      );
    end loop;

    for v_row in
      select p.reference_month,
             sum(p.fgts_amount) as fgts,
             sum(coalesce((
               select sum((item ->> 'amount')::numeric)
                 from jsonb_array_elements(p.items) item
                where item ->> 'code' in ('inss', 'irrf')
             ), 0)) as withheld_taxes
        from public.payslips p
       where p.organization_id = p_organization_id
         and p.status = 'issued'
         and p.reference_month >= date_trunc('month', v_settings.start_date)::date - interval '1 month'
       group by p.reference_month
    loop
      perform public.upsert_automatic_entry(
        p_organization_id, 'payroll_fgts', 'payroll-fgts:' || v_row.reference_month, v_row.reference_month,
        'expense', 'FGTS · ' || to_char(v_row.reference_month, 'MM/YYYY'), v_row.fgts,
        (v_row.reference_month + interval '1 month' + interval '19 days')::date,
        v_tax_category, null, null, null, true
      );
      perform public.upsert_automatic_entry(
        p_organization_id, 'payroll_taxes', 'payroll-taxes:' || v_row.reference_month, v_row.reference_month,
        'expense', 'INSS e IRRF retidos · ' || to_char(v_row.reference_month, 'MM/YYYY'), v_row.withheld_taxes,
        (v_row.reference_month + interval '1 month' + interval '19 days')::date,
        v_tax_category, null, null, null, true
      );
    end loop;

    delete from public.financial_entries fe
     where fe.organization_id = p_organization_id
       and fe.paid_at is null
       and (
         (fe.source = 'payroll_salary' and not exists (
           select 1 from public.payslips p
            where 'payroll-salary:' || p.id = fe.source_key and p.status = 'issued'
         ))
         or (fe.source in ('payroll_fgts', 'payroll_taxes') and not exists (
           select 1 from public.payslips p
            where p.organization_id = p_organization_id
              and p.status = 'issued'
              and p.reference_month = fe.source_date
         ))
       );
  end if;
end;
$function$;
