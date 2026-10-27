alter table public.organizations
  add column credit_card_settlement_days smallint not null default 1
    check (credit_card_settlement_days between 0 and 60),
  add column debit_card_settlement_days smallint not null default 1
    check (debit_card_settlement_days between 0 and 60);

create table public.payment_settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sale_date date not null,
  method public.payment_method not null
    check (method in ('credit_card', 'debit_card', 'pix')),
  received_amount numeric(12, 2) not null check (received_amount >= 0),
  confirmed_at timestamptz not null default now(),
  confirmed_by_name text,
  unique (organization_id, sale_date, method)
);

alter table public.payment_settlements enable row level security;

create policy "payment_settlements: managers read" on public.payment_settlements
  for select to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create function public.add_business_days(p_date date, p_days integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when p_days <= 0 then p_date
    else (
      select day::date
        from generate_series(p_date + 1, p_date + p_days * 2 + 7, interval '1 day') as day
       where extract(isodow from day) < 6
       order by day
      offset p_days - 1
       limit 1
    )
  end;
$$;

create function public.get_payment_receivables(
  p_organization_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization public.organizations;
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_organization from public.organizations where id = p_organization_id;

  return coalesce((
    with receipts as (
      select op.method,
             (op.created_at at time zone v_organization.timezone)::date as sale_date,
             op.amount + op.surcharge as gross,
             (op.amount + op.surcharge) * op.fee_percent / 100 as fee
        from public.order_payments as op
        join public.orders as o on o.id = op.order_id
       where op.organization_id = p_organization_id
         and o.status <> 'canceled'
         and op.method in ('credit_card', 'debit_card', 'pix')
      union all
      select ae.payment_method,
             (ae.created_at at time zone v_organization.timezone)::date,
             ae.amount + ae.surcharge,
             (ae.amount + ae.surcharge) * ae.fee_percent / 100
        from public.account_entries as ae
       where ae.organization_id = p_organization_id
         and ae.kind = 'payment'
         and ae.payment_method in ('credit_card', 'debit_card', 'pix')
    ),
    daily as (
      select sale_date,
             method,
             round(sum(gross), 2) as gross,
             round(sum(fee), 2) as fee
        from receipts
       where sale_date between p_from and p_to
       group by sale_date, method
    )
    select jsonb_agg(
             jsonb_build_object(
               'saleDate', daily.sale_date,
               'method', daily.method,
               'gross', daily.gross,
               'fee', daily.fee,
               'net', daily.gross - daily.fee,
               'expectedOn', public.add_business_days(
                 daily.sale_date,
                 case daily.method
                   when 'credit_card' then v_organization.credit_card_settlement_days
                   when 'debit_card' then v_organization.debit_card_settlement_days
                   else 0
                 end
               ),
               'receivedAmount', settlement.received_amount,
               'confirmedAt', settlement.confirmed_at,
               'confirmedByName', settlement.confirmed_by_name
             )
             order by daily.sale_date desc, daily.method
           )
      from daily
      left join public.payment_settlements as settlement
        on settlement.organization_id = p_organization_id
       and settlement.sale_date = daily.sale_date
       and settlement.method = daily.method
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.get_payment_receivables from public, anon;
grant execute on function public.get_payment_receivables to authenticated;

create function public.confirm_payment_settlement(
  p_organization_id uuid,
  p_sale_date date,
  p_method public.payment_method,
  p_received_amount numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into public.payment_settlements (
    organization_id, sale_date, method, received_amount, confirmed_by_name
  )
  values (
    p_organization_id, p_sale_date, p_method, p_received_amount,
    public.current_person_name(p_organization_id)
  )
  on conflict (organization_id, sale_date, method) do update
    set received_amount = excluded.received_amount,
        confirmed_at = now(),
        confirmed_by_name = excluded.confirmed_by_name;
end;
$$;

revoke execute on function public.confirm_payment_settlement from public, anon;
grant execute on function public.confirm_payment_settlement to authenticated;

create function public.undo_payment_settlement(
  p_organization_id uuid,
  p_sale_date date,
  p_method public.payment_method
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.payment_settlements
   where organization_id = p_organization_id
     and sale_date = p_sale_date
     and method = p_method;
end;
$$;

revoke execute on function public.undo_payment_settlement from public, anon;
grant execute on function public.undo_payment_settlement to authenticated;
