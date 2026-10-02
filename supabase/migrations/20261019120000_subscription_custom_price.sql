update public.subscriptions set has_full_access = false where has_full_access;

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
         plan = p_plan
   where organization_id = p_organization_id;
end;
$$;

create function public.admin_update_subscription(
  p_organization_id uuid,
  p_plan public.subscription_plan,
  p_monthly_price numeric,
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
         trial_ends_at = p_trial_ends_at,
         notes = nullif(trim(p_notes), '')
   where organization_id = p_organization_id;
end;
$$;

revoke execute on function public.admin_update_subscription(uuid, public.subscription_plan, numeric, timestamptz, text) from public, anon;
grant execute on function public.admin_update_subscription(uuid, public.subscription_plan, numeric, timestamptz, text) to authenticated;
