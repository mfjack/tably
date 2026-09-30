drop function public.get_today_dashboard(uuid, boolean, boolean, boolean, boolean, boolean);

update public.organizations
   set hidden_modules = array_remove(hidden_modules, 'dashboard')
 where 'dashboard' = any(hidden_modules);

update public.operators
   set allowed_modules = array_remove(allowed_modules, 'dashboard')
 where 'dashboard' = any(allowed_modules);
