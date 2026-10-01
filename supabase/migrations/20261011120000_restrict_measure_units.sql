alter table public.ingredients
  add constraint ingredients_unit_check check (unit in ('unit', 'g', 'ml'));
