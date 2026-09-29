alter table public.suppliers
  add column supplied_items text check (char_length(supplied_items) <= 200);
