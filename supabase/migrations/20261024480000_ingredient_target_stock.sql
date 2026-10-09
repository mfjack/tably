alter table public.ingredients
  add column target_stock numeric(14, 3) check (target_stock > 0);
