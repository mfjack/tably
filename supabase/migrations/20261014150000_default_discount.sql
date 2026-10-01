alter table public.organizations
  add column default_discount_type text not null default 'percent'
    check (default_discount_type in ('percent', 'amount')),
  add column default_discount_value numeric(12, 2)
    check (default_discount_value > 0);
