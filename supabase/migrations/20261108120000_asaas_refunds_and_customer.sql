alter table public.subscription_payments
  add column reverted_at timestamptz;

create or replace function public.save_asaas_customer(
  p_organization_id uuid,
  p_customer_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.subscriptions
     set asaas_customer_id = p_customer_id
   where organization_id = p_organization_id;
end;
$$;

revoke execute on function public.save_asaas_customer from public, anon;
grant execute on function public.save_asaas_customer to authenticated;

create or replace function public.revert_asaas_payment(p_asaas_payment_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.subscription_payments;
begin
  select * into v_payment
    from public.subscription_payments
   where asaas_payment_id = p_asaas_payment_id
   for update;

  if not found or v_payment.reverted_at is not null then
    return;
  end if;

  update public.subscription_payments
     set reverted_at = now(),
         note = left(coalesce(note, '') || ' · estornado', 300)
   where id = v_payment.id;

  update public.subscriptions
     set paid_until = paid_until - make_interval(months => v_payment.months)
   where organization_id = v_payment.organization_id
     and paid_until is not null;
end;
$$;

revoke execute on function public.revert_asaas_payment from public, anon, authenticated;
grant execute on function public.revert_asaas_payment to service_role;
