drop function if exists public.confirm_payment_settlement(uuid, date, public.payment_method, numeric);
drop function if exists public.undo_payment_settlement(uuid, date, public.payment_method);
drop function if exists public.get_payment_receivables(uuid, date, date);
drop function if exists public.set_employee_pin(uuid, text);
drop table if exists public.payment_settlements;
