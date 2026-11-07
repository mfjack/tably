alter table public.products
  add column position integer;

create or replace function public.reorder_products(
  p_organization_id uuid,
  p_product_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.products as product
     set position = ordered.position - 1
    from unnest(p_product_ids) with ordinality as ordered (product_id, position)
   where product.id = ordered.product_id
     and product.organization_id = p_organization_id;
end;
$$;

revoke execute on function public.reorder_products from public, anon;
grant execute on function public.reorder_products to authenticated;
