create or replace function public.get_pending_receivables(p_organization_id uuid, p_today date)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_organization public.organizations;
begin
  select * into v_organization from public.organizations where id = p_organization_id;

  return (
    with receipts as (
      select op.method,
             (op.created_at at time zone v_organization.timezone)::date as sale_date,
             (op.amount + op.surcharge) * (1 - op.fee_percent / 100) as net
        from public.order_payments as op
        join public.orders as o on o.id = op.order_id
       where op.organization_id = p_organization_id
         and o.status <> 'canceled'
         and op.method in ('credit_card', 'debit_card', 'pix')
      union all
      select ae.payment_method,
             (ae.created_at at time zone v_organization.timezone)::date,
             (ae.amount + ae.surcharge) * (1 - ae.fee_percent / 100)
        from public.account_entries as ae
       where ae.organization_id = p_organization_id
         and ae.kind = 'payment'
         and ae.payment_method in ('credit_card', 'debit_card', 'pix')
    ),
    daily as (
      select public.add_business_days(
               sale_date,
               case method
                 when 'credit_card' then v_organization.credit_card_settlement_days
                 when 'debit_card' then v_organization.debit_card_settlement_days
                 else 0
               end
             ) as expected_on,
             round(sum(net), 2) as net
        from receipts
       where sale_date between p_today - 90 and p_today
       group by sale_date, method
    )
    select jsonb_build_object(
             'amount', coalesce(sum(net), 0),
             'lastExpectedOn', max(expected_on)
           )
      from daily
     where expected_on > p_today
  );
end;
$$;
