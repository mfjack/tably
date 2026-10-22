create index order_items_product_id_idx
  on public.order_items (product_id);

create index stock_movements_ingredient_id_idx
  on public.stock_movements (ingredient_id);

create index account_entries_order_id_idx
  on public.account_entries (order_id);

create index financial_entries_category_id_idx
  on public.financial_entries (category_id);

create index online_orders_order_id_idx
  on public.online_orders (order_id);
