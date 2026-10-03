create or replace function public.is_accepting_online_orders(p_organization public.organizations)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_organization.is_online_ordering_enabled
     and exists (
       select 1
         from public.cash_sessions as session
        where session.organization_id = p_organization.id
          and session.closed_at is null
     );
$$;

revoke execute on function public.is_accepting_online_orders from public, anon, authenticated;
