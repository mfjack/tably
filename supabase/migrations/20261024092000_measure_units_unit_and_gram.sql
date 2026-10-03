update public.ingredients set unit = 'g' where unit = 'ml';

alter table public.ingredients
  drop constraint ingredients_unit_check,
  add constraint ingredients_unit_check check (unit in ('unit', 'g'));
