create unique index products_organization_name_key
  on public.products (organization_id, lower(name));

create function public.save_product(
  p_organization_id uuid,
  p_name text,
  p_price numeric,
  p_is_active boolean,
  p_recipe jsonb,
  p_product_id uuid default null,
  p_category_id uuid default null,
  p_image_url text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product_id uuid;
begin
  if p_product_id is null then
    insert into public.products (
      organization_id, name, category_id, price, image_url, is_active
    )
    values (
      p_organization_id, trim(p_name), p_category_id, p_price, p_image_url, p_is_active
    )
    returning id into v_product_id;
  else
    update public.products
       set name = trim(p_name),
           category_id = p_category_id,
           price = p_price,
           image_url = p_image_url,
           is_active = p_is_active
     where id = p_product_id
       and organization_id = p_organization_id
    returning id into v_product_id;

    if v_product_id is null then
      raise exception 'product not found' using errcode = 'P0002';
    end if;

    delete from public.product_ingredients where product_id = v_product_id;
  end if;

  insert into public.product_ingredients (product_id, ingredient_id, organization_id, quantity)
  select
    v_product_id,
    (recipe_item ->> 'ingredient_id')::uuid,
    p_organization_id,
    (recipe_item ->> 'quantity')::numeric
  from jsonb_array_elements(coalesce(p_recipe, '[]'::jsonb)) as recipe_item;

  return v_product_id;
end;
$$;

revoke execute on function public.save_product from public, anon;
grant execute on function public.save_product to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
);

create function public.can_manage_storage_folder(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  v_organization_id := ((storage.foldername(p_object_name))[1])::uuid;
  return public.has_role(v_organization_id, array['owner', 'manager']::public.member_role[]);
exception
  when invalid_text_representation then
    return false;
end;
$$;

create policy "product images: managers upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.can_manage_storage_folder(name)
  );

create policy "product images: managers update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and public.can_manage_storage_folder(name)
  );

create policy "product images: managers delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and public.can_manage_storage_folder(name)
  );
