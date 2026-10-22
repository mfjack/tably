create or replace function public.get_income_statement(
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
  v_timezone text;
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select timezone into v_timezone from public.organizations where id = p_organization_id;

  return (
    with receipts as (
      select op.amount + op.surcharge as gross, op.fee_percent
        from public.order_payments op
        join public.orders o on o.id = op.order_id
       where op.organization_id = p_organization_id
         and op.method <> 'customer_account'
         and o.status <> 'canceled'
         and (op.created_at at time zone v_timezone)::date between p_from and p_to
      union all
      select ae.amount + ae.surcharge, ae.fee_percent
        from public.account_entries ae
       where ae.organization_id = p_organization_id
         and ae.kind = 'payment'
         and (ae.created_at at time zone v_timezone)::date between p_from and p_to
    ),
    month_orders as (
      select o.id
        from public.orders o
       where o.organization_id = p_organization_id
         and o.status <> 'canceled'
         and o.paid_at is not null
         and (o.paid_at at time zone v_timezone)::date between p_from and p_to
    ),
    category_totals as (
      select coalesce(c.name, 'Sem categoria') as name,
             e.kind,
             coalesce(c.dre_group, case when e.kind = 'income' then 'other_income' else 'administrative' end::public.dre_group) as dre_group,
             sum(e.amount) as amount
        from public.financial_entries e
        left join public.financial_categories c on c.id = e.category_id
       where e.organization_id = p_organization_id
         and e.due_date between p_from and p_to
         and e.counts_in_balance
       group by 1, 2, 3
    )
    select jsonb_build_object(
      'grossSales', coalesce((select round(sum(gross), 2) from receipts), 0),
      'cardFees', coalesce((select round(sum(gross * fee_percent / 100), 2) from receipts), 0),
      'orderCount', (select count(*) from month_orders),
      'recipeCost', coalesce((
        select round(sum(oi.quantity * oi.unit_cost), 2)
          from public.order_items oi
          join month_orders mo on mo.id = oi.order_id
      ), 0),
      'itemsWithoutCost', (
        select count(*)
          from public.order_items oi
          join month_orders mo on mo.id = oi.order_id
         where coalesce(oi.unit_cost, 0) = 0
      ),
      'categories', coalesce((
        select jsonb_agg(
          jsonb_build_object('name', name, 'kind', kind, 'group', dre_group, 'amount', amount)
          order by amount desc
        )
          from category_totals
      ), '[]'::jsonb)
    )
  );
end;
$$;
