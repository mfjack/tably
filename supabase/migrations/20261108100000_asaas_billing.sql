alter table public.subscriptions
  add column asaas_customer_id text,
  add column asaas_subscription_id text unique,
  add column asaas_billing_type text
    check (asaas_billing_type in ('PIX', 'CREDIT_CARD'));

alter table public.subscription_payments
  add column asaas_payment_id text unique;

create or replace function public.save_asaas_subscription(
  p_organization_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_billing_type text
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
     set asaas_customer_id = p_customer_id,
         asaas_subscription_id = p_subscription_id,
         asaas_billing_type = p_billing_type
   where organization_id = p_organization_id;
end;
$$;

revoke execute on function public.save_asaas_subscription from public, anon;
grant execute on function public.save_asaas_subscription to authenticated;

create or replace function public.record_asaas_payment(
  p_asaas_subscription_id text,
  p_asaas_payment_id text,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription public.subscriptions;
  v_months integer;
  v_paid_until timestamptz;
begin
  if exists (
    select 1 from public.subscription_payments
     where asaas_payment_id = p_asaas_payment_id
  ) then
    return;
  end if;

  select * into v_subscription
    from public.subscriptions
   where asaas_subscription_id = p_asaas_subscription_id
   for update;

  if not found then
    raise exception 'subscription not found' using errcode = 'P0002';
  end if;

  v_months := case when v_subscription.billing_cycle = 'yearly' then 12 else 1 end;
  v_paid_until := greatest(
    coalesce(v_subscription.paid_until, now()),
    v_subscription.trial_ends_at,
    now()
  ) + make_interval(months => v_months);

  insert into public.subscription_payments (
    organization_id, amount, months, paid_until, note, asaas_payment_id
  )
  values (
    v_subscription.organization_id,
    round(p_amount, 2),
    v_months,
    v_paid_until,
    'Pagamento automático (Asaas)',
    p_asaas_payment_id
  );

  update public.subscriptions
     set paid_until = v_paid_until,
         payment_reported_at = null
   where organization_id = v_subscription.organization_id;
end;
$$;

revoke execute on function public.record_asaas_payment from public, anon, authenticated;
grant execute on function public.record_asaas_payment to service_role;

CREATE OR REPLACE FUNCTION public.admin_list_subscriptions()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'organizationId', o.id,
        'name', o.name,
        'slug', o.slug,
        'createdAt', o.created_at,
        'ownerEmail', (
          select u.email
            from public.memberships as m
            join auth.users as u on u.id = m.user_id
           where m.organization_id = o.id and m.role = 'owner'
           order by m.created_at
           limit 1
        ),
        'plan', s.plan,
        'billingCycle', s.billing_cycle,
        'monthlyPrice', s.monthly_price,
        'yearlyPrice', s.yearly_price,
        'trialEndsAt', s.trial_ends_at,
        'paidUntil', s.paid_until,
        'paymentReportedAt', s.payment_reported_at,
        'asaasBillingType', s.asaas_billing_type,
        'notes', s.notes,
        'payments', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'amount', p.amount,
              'months', p.months,
              'paidUntil', p.paid_until,
              'note', p.note,
              'createdAt', p.created_at
            )
            order by p.created_at desc
          )
            from public.subscription_payments as p
           where p.organization_id = o.id
        ), '[]'::jsonb)
      )
      order by o.created_at desc
    )
      from public.organizations as o
      join public.subscriptions as s on s.organization_id = o.id
  ), '[]'::jsonb);
end;
$function$;
