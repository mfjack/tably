alter table public.organizations
  add column is_multiple_carts_enabled boolean not null default true;
