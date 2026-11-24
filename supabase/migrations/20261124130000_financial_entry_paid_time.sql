alter table public.financial_entries
  add column paid_recorded_at timestamptz;

update public.financial_entries
   set paid_recorded_at = created_at
 where paid_at is not null
   and paid_at = (created_at at time zone 'America/Sao_Paulo')::date;

CREATE OR REPLACE FUNCTION public.stamp_financial_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    new.created_by_name := public.current_operator_name(new.organization_id);
  end if;

  if new.paid_at is not null and (tg_op = 'INSERT' or old.paid_at is null) then
    new.paid_by_name := public.current_operator_name(new.organization_id);
    new.paid_recorded_at := now();
  elsif new.paid_at is null then
    new.paid_by_name := null;
    new.paid_recorded_at := null;
  end if;

  return new;
end;
$function$;
