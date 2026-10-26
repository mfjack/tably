alter table public.organizations
  add column opening_hours jsonb not null default '[]'::jsonb
    check (jsonb_typeof(opening_hours) = 'array');

create function public.get_opening_status(p_organization public.organizations)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with local_now as (
    select (now() at time zone p_organization.timezone) as moment
  ),
  hours as (
    select (hour ->> 'weekday')::integer as weekday,
           (hour ->> 'opensAt')::time as opens_at,
           (hour ->> 'closesAt')::time as closes_at
      from jsonb_array_elements(p_organization.opening_hours) as hour
  ),
  upcoming as (
    select offset_days, hours.weekday, hours.opens_at, hours.closes_at
      from local_now
     cross join generate_series(0, 7) as offset_days
      join hours
        on hours.weekday = extract(isodow from local_now.moment::date + offset_days)::integer
  ),
  today_open as (
    select upcoming.closes_at
      from upcoming, local_now
     where upcoming.offset_days = 0
       and local_now.moment::time >= upcoming.opens_at
       and local_now.moment::time < upcoming.closes_at
  )
  select case
    when jsonb_array_length(p_organization.opening_hours) = 0 then
      jsonb_build_object('isConfigured', false, 'isOpen', true)
    else
      jsonb_build_object(
        'isConfigured', true,
        'isOpen', exists (select 1 from today_open),
        'closesAt', (select to_char(closes_at, 'HH24:MI') from today_open limit 1),
        'nextOpening', (
          select jsonb_build_object(
                   'daysAhead', upcoming.offset_days,
                   'weekday', upcoming.weekday,
                   'opensAt', to_char(upcoming.opens_at, 'HH24:MI')
                 )
            from upcoming, local_now
           where upcoming.offset_days > 0
              or local_now.moment::time < upcoming.opens_at
           order by upcoming.offset_days, upcoming.opens_at
           limit 1
        )
      )
  end;
$$;

grant execute on function public.get_opening_status to anon, authenticated;

create function public.get_open_weekdays(p_organization_id uuid)
returns integer[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(distinct (hour ->> 'weekday')::integer order by (hour ->> 'weekday')::integer), '{}')
    from public.organizations as o
    cross join jsonb_array_elements(o.opening_hours) as hour
   where o.id = p_organization_id;
$$;

revoke execute on function public.get_open_weekdays from public, anon;
grant execute on function public.get_open_weekdays to authenticated;

create or replace function public.is_accepting_online_orders(p_organization public.organizations)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_organization.is_online_ordering_enabled
     and (public.get_opening_status(p_organization) ->> 'isOpen')::boolean
     and exists (
       select 1
         from public.cash_sessions as session
        where session.organization_id = p_organization.id
          and session.closed_at is null
     );
$$;

create or replace function public.get_public_menu(p_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'title', coalesce(nullif(trim(o.menu_title), ''), o.name),
    'tagline', o.menu_tagline,
    'instagram', o.menu_instagram,
    'note', o.menu_note,
    'acceptsOrders', public.is_accepting_online_orders(o),
    'openingStatus', public.get_opening_status(o),
    'sections', coalesce((
      select jsonb_agg(section.data order by section.created_at, section.position)
        from (
          select
            c.created_at,
            c.position,
            jsonb_build_object(
              'id', c.id,
              'name', c.name,
              'items', jsonb_agg(
                jsonb_build_object(
                  'id', p.id,
                  'name', p.name,
                  'detail', p.menu_detail,
                  'price', p.price,
                  'addons', case when o.is_product_addons_enabled then coalesce((
                    select jsonb_agg(
                      jsonb_build_object(
                        'id', a.id,
                        'name', a.name,
                        'price', a.price,
                        'isAvailable', a.ingredient_id is null or exists (
                          select 1
                            from public.ingredients as addon_ingredient
                           where addon_ingredient.id = a.ingredient_id
                             and addon_ingredient.current_stock >= a.ingredient_quantity
                        )
                      )
                      order by a.name
                    )
                      from public.product_addon_links as l
                      join public.product_addons as a on a.id = l.addon_id
                     where l.product_id = p.id
                       and a.is_active
                  ), '[]'::jsonb) else '[]'::jsonb end,
                  'isAvailable', coalesce(p.stock_quantity, 1) > 0 and not exists (
                    select 1
                      from public.product_ingredients as recipe
                      join public.ingredients as ingredient
                        on ingredient.id = recipe.ingredient_id
                     where recipe.product_id = p.id
                       and (ingredient.current_stock < recipe.quantity
                            or ingredient.expires_at < (now() at time zone o.timezone)::date)
                  ),
                  'remaining', least(
                    case when p.stock_quantity is not null then greatest(p.stock_quantity, 0) end,
                    (
                      select min(floor(greatest(ingredient.current_stock, 0) / recipe.quantity))::integer
                        from public.product_ingredients as recipe
                        join public.ingredients as ingredient
                          on ingredient.id = recipe.ingredient_id
                       where recipe.product_id = p.id
                    )
                  )
                )
                order by p.created_at, p.name
              )
            ) as data
            from public.categories as c
            join public.products as p
              on p.category_id = c.id
             and p.is_active
             and p.is_on_menu
           where c.organization_id = o.id
             and c.is_on_menu
           group by c.id
        ) as section
    ), '[]'::jsonb)
  )
    from public.organizations as o
   where o.slug = p_slug
     and o.is_menu_published;
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
    ), 0) + public.get_sales_receipts(p_organization_id, null, v_today),
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
