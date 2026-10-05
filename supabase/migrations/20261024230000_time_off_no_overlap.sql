create extension if not exists btree_gist with schema extensions;

alter table public.employee_time_off
  add constraint employee_time_off_no_overlap
  exclude using gist (
    employee_id with operator(pg_catalog.=),
    daterange(start_date, end_date, '[]') with operator(pg_catalog.&&)
  );
