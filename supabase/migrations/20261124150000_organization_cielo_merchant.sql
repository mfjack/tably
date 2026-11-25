alter table public.organizations
  add column cielo_merchant_id text
    constraint organizations_cielo_merchant_id_format
      check (cielo_merchant_id ~ '^[A-Za-z0-9-]{1,64}$');
