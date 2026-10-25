alter table public.products
  add column supplier_id uuid,
  add foreign key (supplier_id, organization_id)
    references public.suppliers (id, organization_id) on delete set null (supplier_id);

create index products_supplier_id_idx on public.products (supplier_id);
