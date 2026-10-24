update public.organizations
   set hidden_modules = array_remove(hidden_modules, 'dashboard')
 where 'dashboard' = any(hidden_modules);

update public.memberships
   set allowed_modules = array_remove(allowed_modules, 'dashboard')
 where 'dashboard' = any(allowed_modules);

update public.organization_invitations
   set allowed_modules = array_remove(allowed_modules, 'dashboard')
 where 'dashboard' = any(allowed_modules);
