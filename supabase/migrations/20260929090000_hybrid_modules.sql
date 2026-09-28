drop function public.create_organization(text, text, public.business_type);

alter table public.organizations drop column business_type;

drop type public.business_type;

create type public.app_module as enum (
  'pos',
  'order_tabs',
  'kitchen',
  'customer_accounts',
  'tasks',
  'categories',
  'products',
  'ingredients',
  'suppliers',
  'sales_report'
);

alter table public.organizations
  add column hidden_modules public.app_module[] not null default '{}';

create function public.create_organization(p_name text, p_slug text)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org public.organizations;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (trim(p_name), p_slug, v_user)
  returning * into v_org;

  insert into public.memberships (organization_id, user_id, role)
  values (v_org.id, v_user, 'owner');

  return v_org;
end;
$$;

revoke execute on function public.create_organization from public, anon;
grant execute on function public.create_organization to authenticated;
