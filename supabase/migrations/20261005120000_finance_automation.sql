create type public.financial_entry_source as enum (
  'manual',
  'sales',
  'sales_fee',
  'customer_payments',
  'customer_payments_fee',
  'stock_purchase',
  'payroll_salary',
  'payroll_fgts',
  'payroll_taxes'
);

alter table public.financial_entries
  add column source public.financial_entry_source not null default 'manual',
  add column source_key text,
  add column source_date date,
  add constraint financial_entries_source_key_unique unique (organization_id, source_key),
  add constraint financial_entries_source_key_check check ((source = 'manual') = (source_key is null));

create index financial_entries_source_idx
  on public.financial_entries (organization_id, source, source_date);

create table public.finance_automation_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  start_date date not null,
  is_sales_enabled boolean not null default true,
  is_customer_payments_enabled boolean not null default true,
  is_stock_purchases_enabled boolean not null default false,
  stock_purchase_account_id uuid,
  is_payroll_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  foreign key (stock_purchase_account_id, organization_id)
    references public.financial_accounts (id, organization_id) on delete set null (stock_purchase_account_id)
);

create table public.finance_payment_method_settings (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  payment_method public.payment_method not null,
  account_id uuid,
  fee_percent numeric(5, 2) not null default 0 check (fee_percent between 0 and 100),
  settlement_days smallint not null default 0 check (settlement_days between 0 and 120),
  primary key (organization_id, payment_method),
  check (payment_method <> 'customer_account'),
  foreign key (account_id, organization_id)
    references public.financial_accounts (id, organization_id) on delete set null (account_id)
);

create trigger finance_automation_settings_updated_at
  before update on public.finance_automation_settings
  for each row execute function public.set_updated_at();

alter table public.finance_automation_settings enable row level security;
alter table public.finance_payment_method_settings enable row level security;

create policy "finance_automation_settings: managers all" on public.finance_automation_settings
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "finance_payment_method_settings: managers all" on public.finance_payment_method_settings
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create function public.nth_business_day(
  p_organization_id uuid,
  p_month_start date,
  p_count integer
)
returns date
language plpgsql
stable
set search_path = ''
as $$
declare
  v_day date := p_month_start;
  v_found integer := 0;
begin
  loop
    if extract(isodow from v_day) <> 7
       and not exists (
         select 1 from public.holidays h
          where h.organization_id = p_organization_id and h.holiday_date = v_day
       ) then
      v_found := v_found + 1;
      exit when v_found = p_count;
    end if;
    v_day := v_day + 1;
  end loop;
  return v_day;
end;
$$;

create function public.payment_method_label(p_method public.payment_method)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_method
    when 'cash' then 'Dinheiro'
    when 'pix' then 'Pix'
    when 'credit_card' then 'Crédito'
    when 'debit_card' then 'Débito'
    else 'Outro'
  end;
$$;

create function public.upsert_automatic_entry(
  p_organization_id uuid,
  p_source public.financial_entry_source,
  p_source_key text,
  p_source_date date,
  p_kind public.financial_entry_kind,
  p_description text,
  p_amount numeric,
  p_due_date date,
  p_category_id uuid,
  p_account_id uuid,
  p_supplier_id uuid,
  p_mark_paid_until date,
  p_keep_when_paid boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_paid_at date := case
    when p_account_id is not null and p_mark_paid_until is not null and p_due_date <= p_mark_paid_until
      then p_due_date
  end;
begin
  if p_amount <= 0 then
    delete from public.financial_entries
     where organization_id = p_organization_id
       and source_key = p_source_key
       and (not p_keep_when_paid or paid_at is null);
    return;
  end if;

  insert into public.financial_entries (
    organization_id, kind, description, amount, due_date, category_id, account_id, supplier_id,
    paid_at, paid_amount, source, source_key, source_date
  )
  values (
    p_organization_id, p_kind, p_description, p_amount, p_due_date, p_category_id, p_account_id,
    p_supplier_id, v_paid_at, case when v_paid_at is not null then p_amount end,
    p_source, p_source_key, p_source_date
  )
  on conflict (organization_id, source_key) do update
     set description = excluded.description,
         amount = excluded.amount,
         due_date = excluded.due_date,
         category_id = coalesce(public.financial_entries.category_id, excluded.category_id),
         account_id = case
           when public.financial_entries.paid_at is not null and p_keep_when_paid
             then public.financial_entries.account_id
           else excluded.account_id
         end,
         supplier_id = excluded.supplier_id,
         paid_at = case
           when public.financial_entries.paid_at is not null and p_keep_when_paid
             then public.financial_entries.paid_at
           else excluded.paid_at
         end,
         paid_amount = case
           when public.financial_entries.paid_at is not null and p_keep_when_paid
             then public.financial_entries.paid_amount
           else excluded.paid_amount
         end
   where not (p_keep_when_paid and public.financial_entries.paid_at is not null);
end;
$$;

revoke execute on function public.upsert_automatic_entry from public, anon;
grant execute on function public.upsert_automatic_entry to authenticated;

create function public.sync_financial_automations(p_organization_id uuid)
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
      select p.id, p.reference_month, p.net_amount,
             p.employee_snapshot ->> 'name' as employee_name
        from public.payslips p
       where p.organization_id = p_organization_id
         and p.status = 'issued'
         and p.reference_month >= date_trunc('month', v_settings.start_date)::date - interval '1 month'
    loop
      perform public.upsert_automatic_entry(
        p_organization_id, 'payroll_salary', 'payroll-salary:' || v_row.id, v_row.reference_month,
        'expense', 'Salário ' || v_row.employee_name || ' · ' || to_char(v_row.reference_month, 'MM/YYYY'),
        v_row.net_amount,
        public.nth_business_day(p_organization_id, (v_row.reference_month + interval '1 month')::date, 5),
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

revoke execute on function public.sync_financial_automations from public, anon;
grant execute on function public.sync_financial_automations to authenticated;
