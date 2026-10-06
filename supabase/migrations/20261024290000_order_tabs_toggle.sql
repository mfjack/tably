alter table public.organizations
  add column is_order_tabs_enabled boolean not null default false;

update public.organizations
   set is_order_tabs_enabled = not ('order_tabs' = any (hidden_modules)) or is_online_ordering_enabled,
       hidden_modules = array_remove(hidden_modules, 'order_tabs'::public.app_module);

alter table public.organizations
  add constraint organizations_online_ordering_requires_order_tabs
  check (is_order_tabs_enabled or not is_online_ordering_enabled);
