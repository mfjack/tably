drop function if exists public.touch_pos_presence(uuid);
alter table public.organizations drop column if exists pos_seen_at;

drop function if exists public.nth_business_day(uuid, date, integer);
drop function if exists public.payment_method_label(public.payment_method);
drop table if exists public.finance_payment_method_settings;
drop table if exists public.finance_automation_settings;
