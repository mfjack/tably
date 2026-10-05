create type public.salary_payment_rule as enum ('fifth_business_day', 'last_day', 'fixed_day');

alter table public.payroll_settings
  add column salary_payment_rule public.salary_payment_rule not null default 'fifth_business_day',
  add column salary_payment_day smallint check (salary_payment_day between 1 and 31),
  add column is_salary_paid_next_month boolean not null default true,
  add constraint payroll_settings_fixed_payment_day_check
    check (salary_payment_rule <> 'fixed_day' or salary_payment_day is not null);
