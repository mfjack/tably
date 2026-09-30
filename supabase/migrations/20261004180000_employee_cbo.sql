alter table public.employees
  add column cbo text check (cbo ~ '^[0-9]{6}$');

grant select (cbo), insert (cbo), update (cbo) on public.employees to authenticated;
