alter table public.ingredients
  add column package_name text check (char_length(trim(package_name)) between 1 and 20),
  add column package_size numeric(14, 3) check (package_size > 0),
  add constraint ingredients_package_check
    check ((package_name is null) = (package_size is null));
