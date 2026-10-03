alter table public.ingredients
  drop constraint ingredients_unit_check,
  add constraint ingredients_unit_check check (unit in ('unit', 'g', 'ml'));

update public.ingredients set unit = 'ml'
where unit = 'g' and updated_at = '2026-10-03 21:16:11.164463+00';
