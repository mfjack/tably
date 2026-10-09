alter table public.ingredients
  drop constraint ingredients_package_check,
  drop column package_name,
  drop column package_size;
