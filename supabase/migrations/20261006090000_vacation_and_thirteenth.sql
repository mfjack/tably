create type public.payslip_kind as enum ('monthly', 'vacation', 'thirteenth_first', 'thirteenth_second');

alter table public.payslips
  add column kind public.payslip_kind not null default 'monthly',
  add column details jsonb not null default '{}',
  add column payment_due_date date,
  add column time_off_id uuid references public.employee_time_off (id) on delete set null,
  drop constraint payslips_employee_id_reference_month_key,
  add constraint payslips_employee_month_kind_key unique (employee_id, reference_month, kind);

create or replace function public.sync_financial_automations(p_organization_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
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
               o.payment_method,
               sum(o.total) as total
          from public.orders o
         where o.organization_id = p_organization_id
           and o.status <> 'canceled'
           and o.paid_at is not null
           and o.payment_method in ('cash', 'pix', 'credit_card', 'debit_card')
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
$$;
