create type public.subscription_plan as enum ('essential', 'management', 'complete');

create table public.platform_admins (
  email text primary key check (email = lower(email))
);

alter table public.platform_admins enable row level security;

insert into public.platform_admins (email) values ('ferreira.marlon@live.com');

create function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.platform_admins
     where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke execute on function public.is_platform_admin from public, anon;
grant execute on function public.is_platform_admin to authenticated;

create table public.subscriptions (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  plan public.subscription_plan not null default 'management',
  monthly_price numeric(12, 2) not null check (monthly_price >= 0),
  has_full_access boolean not null default false,
  trial_ends_at timestamptz not null,
  paid_until timestamptz,
  payment_reported_at timestamptz,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  months integer not null default 1 check (months between 1 and 24),
  paid_until timestamptz not null,
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  recorded_by uuid references auth.users (id) on delete set null default auth.uid()
);

create index subscription_payments_organization_idx
  on public.subscription_payments (organization_id, created_at desc);

alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;

create policy "subscriptions: members read" on public.subscriptions
  for select to authenticated
  using (public.is_member(organization_id) or public.is_platform_admin());

create policy "subscription_payments: managers read" on public.subscription_payments
  for select to authenticated
  using (
    public.has_role(organization_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin()
  );

create function public.default_plan_price(p_plan public.subscription_plan)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case p_plan
    when 'essential' then 49
    when 'management' then 99
    else 149
  end::numeric;
$$;

create function public.create_organization_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (organization_id, plan, monthly_price, trial_ends_at)
  values (new.id, 'management', public.default_plan_price('management'), now() + interval '14 days')
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.create_organization_subscription from public, anon, authenticated;

create trigger organizations_create_subscription
  after insert on public.organizations
  for each row execute function public.create_organization_subscription();

insert into public.subscriptions (organization_id, plan, monthly_price, trial_ends_at)
select id, 'management', public.default_plan_price('management'), now() + interval '14 days'
  from public.organizations
on conflict (organization_id) do nothing;

create function public.choose_subscription_plan(
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
     set plan = p_plan,
         monthly_price = public.default_plan_price(p_plan)
   where organization_id = p_organization_id;
end;
$$;

revoke execute on function public.choose_subscription_plan from public, anon;
grant execute on function public.choose_subscription_plan to authenticated;

create function public.report_subscription_payment(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.subscriptions
     set payment_reported_at = now()
   where organization_id = p_organization_id;
end;
$$;

revoke execute on function public.report_subscription_payment from public, anon;
grant execute on function public.report_subscription_payment to authenticated;

create function public.admin_list_subscriptions()
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
        'monthlyPrice', s.monthly_price,
        'hasFullAccess', s.has_full_access,
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

revoke execute on function public.admin_list_subscriptions from public, anon;
grant execute on function public.admin_list_subscriptions to authenticated;

create function public.admin_update_subscription(
  p_organization_id uuid,
  p_plan public.subscription_plan,
  p_monthly_price numeric,
  p_has_full_access boolean,
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
         monthly_price = round(p_monthly_price, 2),
         has_full_access = p_has_full_access,
         trial_ends_at = p_trial_ends_at,
         notes = nullif(trim(p_notes), '')
   where organization_id = p_organization_id;
end;
$$;

revoke execute on function public.admin_update_subscription from public, anon;
grant execute on function public.admin_update_subscription to authenticated;

create function public.admin_record_subscription_payment(
  p_organization_id uuid,
  p_amount numeric,
  p_months integer,
  p_note text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription public.subscriptions;
  v_paid_until timestamptz;
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_subscription
    from public.subscriptions
   where organization_id = p_organization_id
   for update;

  if not found then
    raise exception 'subscription not found' using errcode = 'P0002';
  end if;

  v_paid_until := greatest(
    coalesce(v_subscription.paid_until, now()),
    v_subscription.trial_ends_at,
    now()
  ) + make_interval(months => p_months);

  insert into public.subscription_payments (organization_id, amount, months, paid_until, note)
  values (p_organization_id, round(p_amount, 2), p_months, v_paid_until, nullif(trim(p_note), ''));

  update public.subscriptions
     set paid_until = v_paid_until,
         payment_reported_at = null
   where organization_id = p_organization_id;

  return v_paid_until;
end;
$$;

revoke execute on function public.admin_record_subscription_payment from public, anon;
grant execute on function public.admin_record_subscription_payment to authenticated;
