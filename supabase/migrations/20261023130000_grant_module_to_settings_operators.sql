create function public.grant_module_to_settings_operators(
  p_organization_id uuid,
  p_module public.app_module
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.operators
     set allowed_modules = array_append(allowed_modules, p_module)
   where organization_id = p_organization_id
     and can_access_settings
     and not (p_module = any (allowed_modules));
end;
$$;

revoke execute on function public.grant_module_to_settings_operators from public, anon;
grant execute on function public.grant_module_to_settings_operators to authenticated;
