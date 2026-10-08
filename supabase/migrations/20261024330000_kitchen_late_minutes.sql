alter table public.organizations
  add column kitchen_late_minutes integer not null default 15
  check (kitchen_late_minutes between 1 and 240);
