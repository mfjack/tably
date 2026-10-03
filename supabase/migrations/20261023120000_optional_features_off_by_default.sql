alter table public.organizations
  alter column is_takeaway_enabled set default false,
  alter column is_discount_enabled set default false,
  alter column is_split_bill_enabled set default false,
  alter column is_customer_account_payment_enabled set default false;
