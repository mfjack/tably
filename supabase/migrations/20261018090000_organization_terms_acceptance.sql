alter table public.organizations
  add column terms_accepted_at timestamptz,
  add column terms_version text,
  add column terms_accepted_by uuid references auth.users (id) on delete set null;
