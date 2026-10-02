drop function public.admin_update_subscription(uuid, public.subscription_plan, numeric, boolean, timestamptz, text);
drop function public.admin_update_subscription(uuid, public.subscription_plan, numeric, timestamptz, text);

alter table public.subscriptions drop column has_full_access;
