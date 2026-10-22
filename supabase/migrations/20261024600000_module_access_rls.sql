create function public.has_any_module_access(
  p_organization_id uuid,
  p_modules public.app_module[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.memberships m
     where m.organization_id = p_organization_id
       and m.user_id = (select auth.uid())
       and (m.allowed_modules is null or m.allowed_modules && p_modules)
  );
$$;

revoke execute on function public.has_any_module_access from public, anon;
grant execute on function public.has_any_module_access to authenticated;

alter function public.import_purchase_invoice(uuid, jsonb) security definer;

create policy "financial_entries: module access" on public.financial_entries
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{finance}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{finance}'::public.app_module[]));

create policy "financial_accounts: module access" on public.financial_accounts
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{finance}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{finance}'::public.app_module[]));

create policy "financial_recurrences: module access" on public.financial_recurrences
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{finance}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{finance}'::public.app_module[]));

create policy "financial_transfers: module access" on public.financial_transfers
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{finance}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{finance}'::public.app_module[]));

create policy "financial_categories: module access" on public.financial_categories
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{finance}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{finance}'::public.app_module[]));

create policy "organization_documents: module access" on public.organization_documents
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{documents}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{documents}'::public.app_module[]));

create policy "employees: module access" on public.employees
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]));

create policy "employee_salary_history: module access" on public.employee_salary_history
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]));

create policy "employee_time_off: module access" on public.employee_time_off
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]));

create policy "payslips: module access" on public.payslips
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]));

create policy "payroll_settings: module access" on public.payroll_settings
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]));

create policy "work_schedules: module access" on public.work_schedules
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]));

create policy "work_schedule_days: module access" on public.work_schedule_days
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]));

create policy "holidays: module access" on public.holidays
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]));

create policy "time_punches: module access" on public.time_punches
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]));

create policy "time_punch_voids: module access" on public.time_punch_voids
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{employees,payroll,time_clock}'::public.app_module[]));
