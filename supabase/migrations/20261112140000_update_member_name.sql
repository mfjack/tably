drop function if exists public.update_member_access(uuid, uuid, public.app_module[], boolean);

create function public.update_member_access(
  p_organization_id uuid,
  p_user_id uuid,
  p_full_name text,
  p_allowed_modules public.app_module[],
  p_can_access_settings boolean
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

  update public.memberships
     set allowed_modules = p_allowed_modules,
         can_access_settings = p_can_access_settings
   where organization_id = p_organization_id
     and user_id = p_user_id
     and role <> 'owner';

  if not found then
    raise exception 'member not found' using errcode = 'TB041';
  end if;

  update public.profiles
     set full_name = nullif(trim(p_full_name), '')
   where id = p_user_id;
end;
$$;

revoke all on function public.update_member_access(uuid, uuid, text, public.app_module[], boolean) from public, anon;
grant execute on function public.update_member_access(uuid, uuid, text, public.app_module[], boolean) to authenticated;
