drop function public.apply_stock_count(uuid, jsonb);

alter table public.stock_movements
  drop column stock_count_id;

drop table public.stock_count_items;

drop table public.stock_counts;
