alter table public.online_orders
  add column customer_phone text check (customer_phone ~ '^[0-9]{10,11}$');

create function public.get_available_loyalty_settings(p_organization_id uuid)
returns public.loyalty_settings
language sql
stable
security definer
set search_path = ''
as $$
  select settings.*
    from public.loyalty_settings as settings
    left join public.subscriptions as subscription
      on subscription.organization_id = settings.organization_id
   where settings.organization_id = p_organization_id
     and settings.is_enabled
     and (
       subscription.organization_id is null
       or subscription.plan <> 'essential'
       or (
         (subscription.paid_until is null or now() > subscription.paid_until)
         and now() <= subscription.trial_ends_at
       )
     );
$$;

revoke execute on function public.get_available_loyalty_settings from public, anon, authenticated;

create function public.get_public_loyalty_program(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization public.organizations;
  v_settings public.loyalty_settings;
begin
  select * into v_organization from public.organizations where slug = p_slug;
  if not found or not v_organization.is_menu_published then
    return null;
  end if;

  v_settings := public.get_available_loyalty_settings(v_organization.id);
  if v_settings.organization_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'stamps_required', v_settings.stamps_required,
    'reward_description', v_settings.reward_description
  );
end;
$$;

grant execute on function public.get_public_loyalty_program to anon, authenticated;

create function public.get_public_loyalty_balance(p_slug text, p_phone text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization public.organizations;
  v_settings public.loyalty_settings;
  v_customer_id uuid;
begin
  if p_phone !~ '^[0-9]{10,11}$' then
    raise exception 'invalid phone' using errcode = '22023';
  end if;

  select * into v_organization from public.organizations where slug = p_slug;
  if not found or not v_organization.is_menu_published then
    raise exception 'menu not found' using errcode = 'P0002';
  end if;

  v_settings := public.get_available_loyalty_settings(v_organization.id);
  if v_settings.organization_id is null then
    raise exception 'loyalty is disabled' using errcode = 'TB020';
  end if;

  select id into v_customer_id
    from public.loyalty_customers
   where organization_id = v_organization.id
     and phone = p_phone;

  if v_customer_id is null then
    return 0;
  end if;

  return public.get_loyalty_balance(v_customer_id);
end;
$$;

grant execute on function public.get_public_loyalty_balance to anon, authenticated;

create function public.set_online_order_phone(
  p_online_order_id uuid,
  p_device_id uuid,
  p_phone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_online_order public.online_orders;
  v_settings public.loyalty_settings;
begin
  if p_phone !~ '^[0-9]{10,11}$' then
    raise exception 'invalid phone' using errcode = '22023';
  end if;

  select * into v_online_order
    from public.online_orders
   where id = p_online_order_id
     and device_id = p_device_id
     and status = 'pending';

  if not found then
    raise exception 'online order not found' using errcode = 'P0002';
  end if;

  v_settings := public.get_available_loyalty_settings(v_online_order.organization_id);
  if v_settings.organization_id is null then
    raise exception 'loyalty is disabled' using errcode = 'TB020';
  end if;

  update public.online_orders
     set customer_phone = p_phone
   where id = p_online_order_id;
end;
$$;

grant execute on function public.set_online_order_phone to anon, authenticated;
