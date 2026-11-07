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
    'complete',
    public.default_plan_price('complete'),
    public.default_plan_yearly_price('complete'),
    now() + interval '14 days'
  )
  on conflict (organization_id) do nothing;
  return new;
end;
$$;
