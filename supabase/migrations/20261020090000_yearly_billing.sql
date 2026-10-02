create type public.billing_cycle as enum ('monthly', 'yearly');

create function public.default_plan_yearly_price(p_plan public.subscription_plan)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select public.default_plan_price(p_plan) * 10;
$$;

alter table public.subscriptions
  add column billing_cycle public.billing_cycle not null default 'monthly',
  add column yearly_price numeric(12, 2) not null default 0 check (yearly_price >= 0);

update public.subscriptions set yearly_price = monthly_price * 10;

create or replace function public.create_organization_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (
    organization_id, plan, monthly_price, yearly_price, trial_ends_at
  )
  values (
    new.id,
    'management',
    public.default_plan_price('management'),
    public.default_plan_yearly_price('management'),
    now() + interval '14 days'
  )
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

create or replace function public.choose_subscription_plan(
  p_organization_id uuid,
  p_plan public.subscription_plan
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner']::public.member_role[]) then
    raise exception 'only the owner can change the plan' using errcode = '42501';
  end if;

  update public.subscriptions
     set monthly_price = case
           when monthly_price = public.default_plan_price(plan)
             then public.default_plan_price(p_plan)
           else monthly_price
         end,
         yearly_price = case
           when yearly_price = public.default_plan_yearly_price(plan)
             then public.default_plan_yearly_price(p_plan)
           else yearly_price
         end,
         plan = p_plan
   where organization_id = p_organization_id;
end;
$$;

create function public.choose_billing_cycle(
  p_organization_id uuid,
  p_billing_cycle public.billing_cycle
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner']::public.member_role[]) then
    raise exception 'only the owner can change the billing cycle' using errcode = '42501';
  end if;

  update public.subscriptions
     set billing_cycle = p_billing_cycle,
         payment_reported_at = null
   where organization_id = p_organization_id;
end;
$$;

revoke execute on function public.choose_billing_cycle from public, anon;
grant execute on function public.choose_billing_cycle to authenticated;

create function public.admin_update_subscription(
  p_organization_id uuid,
  p_plan public.subscription_plan,
  p_billing_cycle public.billing_cycle,
  p_monthly_price numeric,
  p_yearly_price numeric,
  p_trial_ends_at timestamptz,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.subscriptions
     set plan = p_plan,
         billing_cycle = p_billing_cycle,
         monthly_price = round(p_monthly_price, 2),
         yearly_price = round(p_yearly_price, 2),
         trial_ends_at = p_trial_ends_at,
         notes = nullif(trim(p_notes), '')
   where organization_id = p_organization_id;
end;
$$;

revoke execute on function public.admin_update_subscription(uuid, public.subscription_plan, public.billing_cycle, numeric, numeric, timestamptz, text) from public, anon;
grant execute on function public.admin_update_subscription(uuid, public.subscription_plan, public.billing_cycle, numeric, numeric, timestamptz, text) to authenticated;

create or replace function public.admin_list_subscriptions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
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
$$;
