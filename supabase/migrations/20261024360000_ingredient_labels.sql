create type public.storage_condition as enum ('room_temperature', 'refrigerated', 'frozen');

alter table public.ingredients
  add column label_shelf_life_hours integer check (label_shelf_life_hours between 1 and 8760),
  add column label_storage public.storage_condition;
