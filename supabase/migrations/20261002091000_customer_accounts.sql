create type public.account_entry_kind as enum ('charge', 'payment');

create table public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  phone text check (phone ~ '^[0-9]{10,11}$'),
  credit_limit numeric(12, 2) check (credit_limit > 0),
  note text check (char_length(note) <= 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index customer_accounts_organization_name_idx
  on public.customer_accounts (organization_id, lower(trim(name)));

create trigger customer_accounts_updated_at
  before update on public.customer_accounts
  for each row execute function public.set_updated_at();

create table public.account_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  account_id uuid not null,
  kind public.account_entry_kind not null,
  amount numeric(12, 2) not null check (amount > 0),
  order_id uuid,
  payment_method public.payment_method,
  note text check (char_length(note) <= 300),
  operator_name text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (
    (kind = 'charge' and payment_method is null)
    or (kind = 'payment' and payment_method is not null and payment_method <> 'customer_account')
  ),
  foreign key (account_id, organization_id)
    references public.customer_accounts (id, organization_id) on delete cascade,
  foreign key (order_id, organization_id)
    references public.orders (id, organization_id) on delete set null (order_id)
);

create index account_entries_account_id_idx on public.account_entries (account_id, created_at desc);

create index account_entries_payments_idx
  on public.account_entries (organization_id, created_at)
  where kind = 'payment';

alter table public.orders
  add column customer_account_id uuid,
  add constraint orders_customer_account_fkey
    foreign key (customer_account_id, organization_id)
    references public.customer_accounts (id, organization_id) on delete set null (customer_account_id);

alter table public.customer_accounts enable row level security;
alter table public.account_entries enable row level security;

create policy "customer_accounts: members read" on public.customer_accounts
  for select to authenticated using (public.is_member(organization_id));

create policy "account_entries: members read" on public.account_entries
  for select to authenticated using (public.is_member(organization_id));

create view public.customer_account_balances
with (security_invoker = true)
as
select
  a.id as account_id,
  a.organization_id,
  coalesce(sum(case when e.kind = 'charge' then e.amount else -e.amount end), 0)::numeric(12, 2) as balance,
  max(e.created_at) as last_entry_at
from public.customer_accounts as a
left join public.account_entries as e on e.account_id = a.id
group by a.id, a.organization_id;

create function public.stamp_account_entry_operator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.operator_name := public.current_operator_name(new.organization_id);
  return new;
end;
$$;

create trigger account_entries_stamp_operator
  before insert on public.account_entries
  for each row execute function public.stamp_account_entry_operator();

create function public.get_account_balance(p_account_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(case when kind = 'charge' then amount else -amount end), 0)
    from public.account_entries
   where account_id = p_account_id;
$$;

revoke execute on function public.get_account_balance from public, anon, authenticated;

create function public.charge_customer_account(
  p_organization_id uuid,
  p_account_id uuid,
  p_order_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.customer_accounts;
begin
  if p_account_id is null then
    raise exception 'customer account is required' using errcode = '22023';
  end if;

  select * into v_account
    from public.customer_accounts
   where id = p_account_id
     and organization_id = p_organization_id
     and is_active
   for update;

  if not found then
    raise exception 'customer account not found' using errcode = 'P0002';
  end if;

  if v_account.credit_limit is not null
     and public.get_account_balance(p_account_id) + p_amount > v_account.credit_limit then
    raise exception 'credit limit exceeded' using errcode = 'TB005';
  end if;

  insert into public.account_entries (organization_id, account_id, kind, amount, order_id)
  values (p_organization_id, p_account_id, 'charge', p_amount, p_order_id);

  update public.orders
     set customer_account_id = p_account_id,
         customer_name = coalesce(customer_name, v_account.name)
   where id = p_order_id;
end;
$$;

revoke execute on function public.charge_customer_account from public, anon, authenticated;

create function public.save_customer_account(
  p_organization_id uuid,
  p_name text,
  p_phone text default null,
  p_credit_limit numeric default null,
  p_note text default null,
  p_is_active boolean default true,
  p_account_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  if p_account_id is null then
    insert into public.customer_accounts (organization_id, name, phone, credit_limit, note, is_active)
    values (
      p_organization_id,
      trim(p_name),
      nullif(p_phone, ''),
      p_credit_limit,
      nullif(trim(p_note), ''),
      coalesce(p_is_active, true)
    )
    returning id into v_account_id;
  else
    update public.customer_accounts
       set name = trim(p_name),
           phone = nullif(p_phone, ''),
           credit_limit = p_credit_limit,
           note = nullif(trim(p_note), ''),
           is_active = coalesce(p_is_active, true)
     where id = p_account_id
       and organization_id = p_organization_id
    returning id into v_account_id;

    if v_account_id is null then
      raise exception 'customer account not found' using errcode = 'P0002';
    end if;
  end if;

  return v_account_id;
end;
$$;

revoke execute on function public.save_customer_account from public, anon;
grant execute on function public.save_customer_account to authenticated;

create function public.register_account_payment(
  p_account_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method,
  p_note text default null
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.customer_accounts;
  v_balance numeric;
begin
  select * into v_account from public.customer_accounts where id = p_account_id for update;

  if not found or not public.is_member(v_account.organization_id) then
    raise exception 'customer account not found' using errcode = 'P0002';
  end if;

  if coalesce(p_amount, 0) <= 0 or p_payment_method = 'customer_account' then
    raise exception 'invalid payment' using errcode = '22023';
  end if;

  v_balance := public.get_account_balance(p_account_id);

  if p_amount > v_balance then
    raise exception 'payment exceeds balance' using errcode = 'TB006';
  end if;

  insert into public.account_entries (organization_id, account_id, kind, amount, payment_method, note)
  values (v_account.organization_id, p_account_id, 'payment', p_amount, p_payment_method, nullif(trim(p_note), ''));

  return v_balance - p_amount;
end;
$$;

revoke execute on function public.register_account_payment from public, anon;
grant execute on function public.register_account_payment to authenticated;

drop function public.place_order(uuid, jsonb, text, public.payment_method, numeric, text, boolean, boolean);

create function public.place_order(
  p_organization_id uuid,
  p_items jsonb,
  p_note text default null,
  p_payment_method public.payment_method default null,
  p_amount_received numeric default null,
  p_customer_name text default null,
  p_is_takeaway boolean default false,
  p_send_to_kitchen boolean default true,
  p_customer_account_id uuid default null
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
  v_is_open boolean := coalesce(p_send_to_kitchen, true) or p_payment_method is null;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  drop table if exists requested_items;

  create temporary table requested_items on commit drop as
  select
    (item ->> 'product_id')::uuid as product_id,
    sum((item ->> 'quantity')::integer) as quantity
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  group by 1;

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
     and p.is_active;

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

  if v_is_open and nullif(trim(p_customer_name), '') is not null then
    perform pg_advisory_xact_lock(
      hashtext(p_organization_id::text || ':' || lower(trim(p_customer_name)))
    );

    if public.is_customer_name_in_use(p_organization_id, p_customer_name) then
      raise exception 'customer name already in use' using errcode = 'TB002';
    end if;
  end if;

  if p_payment_method = 'cash' and coalesce(p_amount_received, 0) < v_total then
    raise exception 'amount received is lower than total' using errcode = '22023';
  end if;

  update public.organizations
     set last_order_number = last_order_number + 1
   where id = p_organization_id
  returning last_order_number into v_order_number;

  insert into public.orders (
    organization_id, number, status, note, customer_name, is_takeaway,
    subtotal, takeaway_fee, total, payment_method, amount_received, paid_at, paid_by
  )
  values (
    p_organization_id,
    v_order_number,
    case when v_is_open then 'in_kitchen' else 'completed' end::public.order_status,
    nullif(trim(p_note), ''),
    nullif(trim(p_customer_name), ''),
    v_is_takeaway,
    v_subtotal,
    v_takeaway_fee,
    v_total,
    p_payment_method,
    case when p_payment_method = 'cash' then p_amount_received end,
    case when p_payment_method is not null then now() end,
    case when p_payment_method is not null then auth.uid() end
  )
  returning id into v_order_id;

  if p_payment_method = 'customer_account' then
    perform public.charge_customer_account(p_organization_id, p_customer_account_id, v_order_id, v_total);
  end if;

  insert into public.order_items (
    organization_id, order_id, product_id, product_name, quantity, unit_price
  )
  select p_organization_id, v_order_id, p.id, p.name, requested.quantity, p.price
    from requested_items as requested
    join public.products as p on p.id = requested.product_id;

  select jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity))
    into v_items
    from requested_items;

  if coalesce(p_send_to_kitchen, true) then
    perform public.create_kitchen_ticket(p_organization_id, v_order_id, v_items, p_note, false);
  end if;

  perform public.move_order_stock(p_organization_id, v_order_id, v_items, false);

  return query select v_order_id, v_order_number, v_total;
end;
$$;

revoke execute on function public.place_order from public, anon;
grant execute on function public.place_order to authenticated;

drop function public.pay_order(uuid, public.payment_method, numeric);

create function public.pay_order(
  p_order_id uuid,
  p_payment_method public.payment_method,
  p_amount_received numeric default null,
  p_customer_account_id uuid default null
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  v_order := public.lock_open_order(p_order_id);

  if not exists (select 1 from public.order_items where order_id = p_order_id) then
    raise exception 'order has no items' using errcode = '22023';
  end if;

  if p_payment_method = 'cash' and coalesce(p_amount_received, 0) < v_order.total then
    raise exception 'amount received is lower than total' using errcode = '22023';
  end if;

  update public.orders
     set payment_method = p_payment_method,
         amount_received = case when p_payment_method = 'cash' then p_amount_received end,
         paid_at = now(),
         paid_by = auth.uid()
   where id = p_order_id;

  if p_payment_method = 'customer_account' then
    perform public.charge_customer_account(v_order.organization_id, p_customer_account_id, p_order_id, v_order.total);
  end if;

  perform public.complete_order_if_done(p_order_id);

  return v_order.total;
end;
$$;

revoke execute on function public.pay_order from public, anon;
grant execute on function public.pay_order to authenticated;

create or replace function public.get_sales_report(
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
        select payment_method, sum(total) as revenue, count(*) as order_count
          from current_orders
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
        select paid_by_operator_name, payment_method, sum(total) as revenue, count(*) as order_count
          from current_orders
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
$$;
