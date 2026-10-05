create function public.describe_payslip_payable(p_payslip public.payslips)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_payslip.kind
           when 'vacation' then 'Férias'
           when 'thirteenth_first' then '13º salário (1ª parcela)'
           when 'thirteenth_second' then '13º salário (2ª parcela)'
           else 'Salário'
         end
         || ' de ' || coalesce(p_payslip.employee_snapshot ->> 'name', 'funcionário')
         || ' · '
         || (array[
              'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
              'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
            ])[extract(month from p_payslip.reference_month)::integer]
         || '/' || extract(year from p_payslip.reference_month)::integer;
$$;

create function public.sync_payslip_payable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payslip public.payslips := case when tg_op = 'DELETE' then old else new end;
  v_source_key text := 'payslip:' || v_payslip.id;
begin
  if tg_op <> 'DELETE' and new.status = 'issued' and new.net_amount > 0 then
    insert into public.financial_entries (
      organization_id, kind, description, amount, due_date, category_id,
      account_id, source, source_key, source_date
    )
    values (
      new.organization_id,
      'expense',
      public.describe_payslip_payable(new),
      new.net_amount,
      coalesce(new.payment_due_date, (new.issued_at at time zone 'America/Sao_Paulo')::date, current_date),
      (
        select c.id from public.financial_categories c
         where c.organization_id = new.organization_id
           and c.kind = 'expense'
           and c.name = 'Salários e encargos'
         limit 1
      ),
      (
        select a.id from public.financial_accounts a
         where a.organization_id = new.organization_id
           and not a.is_archived
         order by a.created_at
         limit 1
      ),
      'payroll_salary',
      v_source_key,
      new.reference_month
    )
    on conflict (organization_id, source_key) do update
      set description = excluded.description,
          amount = excluded.amount,
          due_date = excluded.due_date
      where public.financial_entries.paid_at is null;
    return new;
  end if;

  delete from public.financial_entries
   where organization_id = v_payslip.organization_id
     and source_key = v_source_key
     and paid_at is null;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function public.sync_payslip_payable from public, anon, authenticated;

create trigger payslips_sync_payable
  after update of status, net_amount, payment_due_date or delete on public.payslips
  for each row execute function public.sync_payslip_payable();
