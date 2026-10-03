drop function public.get_public_loyalty_balance(text, text);

create function public.get_public_loyalty_status(p_slug text, p_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization public.organizations;
  v_settings public.loyalty_settings;
  v_customer public.loyalty_customers;
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

  select * into v_customer
    from public.loyalty_customers
   where organization_id = v_organization.id
     and phone = p_phone;

  if not found then
    return jsonb_build_object('first_name', null, 'balance', 0, 'has_stamp_today', false);
  end if;

  return jsonb_build_object(
    'first_name', split_part(trim(v_customer.name), ' ', 1),
    'balance', public.get_loyalty_balance(v_customer.id),
    'has_stamp_today', public.has_loyalty_stamp_today(v_customer.id)
  );
end;
$$;

grant execute on function public.get_public_loyalty_status to anon, authenticated;
