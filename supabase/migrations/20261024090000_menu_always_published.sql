update public.organizations set is_menu_published = true where not is_menu_published;

alter table public.organizations alter column is_menu_published set default true;
