create or replace function public.save_operator(
  p_organization_id uuid,
  p_name text,
  p_allowed_modules public.app_module[],
  p_can_access_settings boolean,
  p_pin text default null,
  p_operator_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator_id uuid;
  v_pin text := nullif(p_pin, '');
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed to manage operators' using errcode = '42501';
  end if;

  if v_pin is not null and v_pin !~ '^[0-9]{4}$' then
    raise exception 'invalid pin' using errcode = '22023';
  end if;

  if cardinality(coalesce(p_allowed_modules, '{}')) = 0
     and not coalesce(p_can_access_settings, false) then
    raise exception 'operator needs at least one page' using errcode = '22023';
  end if;

  if p_operator_id is null then
    if v_pin is null then
      raise exception 'pin is required' using errcode = '22023';
    end if;

    insert into public.operators (
      organization_id, name, pin_hash, allowed_modules, can_access_settings
    )
    values (
      p_organization_id,
      trim(p_name),
      extensions.crypt(v_pin, extensions.gen_salt('bf')),
      coalesce(p_allowed_modules, '{}'),
      coalesce(p_can_access_settings, false)
    )
    returning id into v_operator_id;
  else
    update public.operators
       set name = trim(p_name),
           pin_hash = case
             when v_pin is null then pin_hash
             else extensions.crypt(v_pin, extensions.gen_salt('bf'))
           end,
           allowed_modules = coalesce(p_allowed_modules, '{}'),
           can_access_settings = coalesce(p_can_access_settings, false)
     where id = p_operator_id
       and organization_id = p_organization_id
    returning id into v_operator_id;

    if v_operator_id is null then
      raise exception 'operator not found' using errcode = 'P0002';
    end if;
  end if;

  perform public.ensure_operator_with_settings(p_organization_id);

  return v_operator_id;
end;
$$;
