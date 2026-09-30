alter type public.app_module add value 'dashboard';

create function public.get_today_dashboard(
  p_organization_id uuid,
  p_include_sales boolean,
  p_include_operations boolean,
  p_include_finance boolean,
  p_include_stock boolean,
  p_include_team boolean
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date;
  v_timezone text;
  v_is_manager boolean;
  v_result jsonb := '{}'::jsonb;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member' using errcode = '42501';
  end if;

  v_is_manager := public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]);
  v_today := public.organization_today(p_organization_id);
  select timezone into v_timezone from public.organizations where id = p_organization_id;
  v_result := jsonb_build_object('today', v_today, 'timeZone', v_timezone);

  if p_include_sales then
    v_result := v_result || jsonb_build_object('sales', (
      select jsonb_build_object(
        'revenue', coalesce(sum(o.total) filter (where local_date = v_today), 0),
        'orderCount', count(*) filter (where local_date = v_today),
        'lastWeekRevenue', coalesce(sum(o.total) filter (where local_date = v_today - 7), 0),
        'lastWeekOrderCount', count(*) filter (where local_date = v_today - 7)
      )
        from (
          select o.total, (o.paid_at at time zone v_timezone)::date as local_date
            from public.orders o
           where o.organization_id = p_organization_id
             and o.status <> 'canceled'
             and o.paid_at is not null
             and (o.paid_at at time zone v_timezone)::date in (v_today, v_today - 7)
        ) o
    ));
  end if;

  if p_include_operations then
    v_result := v_result || jsonb_build_object(
      'openOrders', (
        select jsonb_build_object('count', count(*), 'total', coalesce(sum(total), 0))
          from public.orders
         where organization_id = p_organization_id
           and paid_at is null
           and status <> 'canceled'
      ),
      'kitchen', (
        select jsonb_build_object(
          'preparing', count(*) filter (where status = 'preparing'),
          'ready', count(*) filter (where status = 'ready')
        )
          from public.kitchen_tickets
         where organization_id = p_organization_id
           and status in ('preparing', 'ready')
      )
    );
  end if;

  if p_include_finance and v_is_manager then
    v_result := v_result || jsonb_build_object('finance', (
      select jsonb_build_object(
        'overdueCount', count(*) filter (where kind = 'expense' and due_date < v_today),
        'overdueAmount', coalesce(sum(amount) filter (where kind = 'expense' and due_date < v_today), 0),
        'dueTodayCount', count(*) filter (where kind = 'expense' and due_date = v_today),
        'dueTodayAmount', coalesce(sum(amount) filter (where kind = 'expense' and due_date = v_today), 0),
        'receivableTodayAmount', coalesce(sum(amount) filter (where kind = 'income' and due_date = v_today), 0)
      )
        from public.financial_entries
       where organization_id = p_organization_id
         and paid_at is null
         and due_date <= v_today
    ));
  end if;

  if p_include_stock then
    v_result := v_result || jsonb_build_object('stock', (
      select jsonb_build_object(
        'lowCount', count(*),
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'name', i.name, 'unit', i.unit, 'currentStock', i.current_stock, 'minimumStock', i.minimum_stock
          ) order by i.current_stock / nullif(i.minimum_stock, 0) nulls first, i.name)
            from (
              select * from public.ingredients
               where organization_id = p_organization_id
                 and (current_stock <= 0 or current_stock <= minimum_stock)
               order by current_stock / nullif(minimum_stock, 0) nulls first, name
               limit 5
            ) i
        ), '[]'::jsonb)
      )
        from public.ingredients
       where organization_id = p_organization_id
         and (current_stock <= 0 or current_stock <= minimum_stock)
    ));
  end if;

  if p_include_team and v_is_manager then
    v_result := v_result || jsonb_build_object('team', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'expectedStart', d.start_time,
        'isOnTimeOff', exists (
          select 1 from public.employee_time_off t
           where t.employee_id = e.id and v_today between t.start_date and t.end_date
        ),
        'isHoliday', exists (
          select 1 from public.holidays h
           where h.organization_id = p_organization_id and h.holiday_date = v_today
        ),
        'punches', coalesce((
          select jsonb_agg(p.punched_at order by p.punched_at)
            from public.time_punches p
           where p.employee_id = e.id
             and p.work_date = v_today
             and not exists (select 1 from public.time_punch_voids v where v.punch_id = p.id)
        ), '[]'::jsonb)
      ) order by e.name)
        from public.employees e
        left join public.work_schedule_days d
          on d.schedule_id = e.work_schedule_id
         and d.weekday = extract(isodow from v_today)
       where e.organization_id = p_organization_id
         and e.admission_date <= v_today
         and (e.termination_date is null or e.termination_date >= v_today)
    ), '[]'::jsonb));
  end if;

  return v_result;
end;
$$;

revoke execute on function public.get_today_dashboard from public, anon;
grant execute on function public.get_today_dashboard to authenticated;
