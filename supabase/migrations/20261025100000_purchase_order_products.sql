alter table public.purchase_order_items drop constraint purchase_order_items_pkey;

alter table public.purchase_order_items
  add column id uuid primary key default gen_random_uuid(),
  add column product_id uuid,
  alter column ingredient_id drop not null,
  add constraint purchase_order_items_single_item
    check (num_nonnulls(ingredient_id, product_id) = 1),
  add foreign key (product_id, organization_id)
    references public.products (id, organization_id) on delete cascade;

create unique index purchase_order_items_order_ingredient_key
  on public.purchase_order_items (order_id, ingredient_id)
  where ingredient_id is not null;

create unique index purchase_order_items_order_product_key
  on public.purchase_order_items (order_id, product_id)
  where product_id is not null;

create index purchase_order_items_order_id_idx
  on public.purchase_order_items (order_id);

create index purchase_order_items_product_id_idx
  on public.purchase_order_items (product_id);

create or replace function public.create_purchase_order(
  p_organization_id uuid,
  p_items jsonb,
  p_supplier_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_ingredient_count integer;
  v_product_count integer;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  if p_supplier_id is not null and not exists (
    select 1 from public.suppliers
     where id = p_supplier_id and organization_id = p_organization_id
  ) then
    raise exception 'supplier not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
     where item ->> 'product_id' is not null
       and (item ->> 'quantity')::numeric <> trunc((item ->> 'quantity')::numeric)
  ) then
    raise exception 'product quantity must be an integer' using errcode = '22023';
  end if;

  insert into public.purchase_orders (organization_id, supplier_id, created_by_name)
  values (p_organization_id, p_supplier_id, public.current_person_name(p_organization_id))
  returning id into v_order_id;

  insert into public.purchase_order_items (order_id, ingredient_id, organization_id, quantity)
  select v_order_id, i.id, p_organization_id, sum((item ->> 'quantity')::numeric)
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
    join public.ingredients as i
      on i.id = (item ->> 'ingredient_id')::uuid
     and i.organization_id = p_organization_id
   where (item ->> 'quantity')::numeric > 0
   group by i.id;

  get diagnostics v_ingredient_count = row_count;

  insert into public.purchase_order_items (order_id, product_id, organization_id, quantity)
  select v_order_id, p.id, p_organization_id, sum((item ->> 'quantity')::numeric)
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
    join public.products as p
      on p.id = (item ->> 'product_id')::uuid
     and p.organization_id = p_organization_id
     and p.stock_quantity is not null
   where (item ->> 'quantity')::numeric > 0
   group by p.id;

  get diagnostics v_product_count = row_count;

  if v_ingredient_count + v_product_count = 0 then
    raise exception 'purchase order has no items' using errcode = '22023';
  end if;

  return v_order_id;
end;
$$;

create or replace function public.receive_purchase_order(
  p_order_id uuid,
  p_items jsonb,
  p_payment_due_date date default null
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.purchase_orders;
  v_total numeric(12, 2);
  v_supplier_name text;
  v_today date;
begin
  select * into v_order
    from public.purchase_orders
   where id = p_order_id
     for update;

  if not found then
    raise exception 'purchase order not found' using errcode = 'P0002';
  end if;

  if not public.has_role(v_order.organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed to receive purchase orders' using errcode = '42501';
  end if;

  if v_order.status <> 'pending' then
    raise exception 'purchase order is not pending' using errcode = 'TB034';
  end if;

  drop table if exists received_items;

  create temporary table received_items on commit drop as
  select
    (item ->> 'ingredient_id')::uuid as ingredient_id,
    (item ->> 'product_id')::uuid as product_id,
    coalesce((item ->> 'quantity')::numeric, 0) as quantity,
    coalesce((item ->> 'total_cost')::numeric, 0) as total_cost
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item;

  if exists (
    select 1 from received_items
     where quantity < 0
        or total_cost < 0
        or (product_id is not null and quantity <> trunc(quantity))
  ) then
    raise exception 'invalid received item' using errcode = '22023';
  end if;

  update public.purchase_order_items as ordered
     set received_quantity = received.quantity,
         received_cost = received.total_cost
    from received_items as received
   where ordered.order_id = p_order_id
     and (ordered.ingredient_id = received.ingredient_id
          or ordered.product_id = received.product_id);

  if not exists (
    select 1 from public.purchase_order_items
     where order_id = p_order_id
       and received_quantity > 0
  ) then
    raise exception 'nothing received' using errcode = '22023';
  end if;

  insert into public.stock_entries (
    organization_id, ingredient_id, supplier_id, quantity, total_cost
  )
  select v_order.organization_id, ordered.ingredient_id, v_order.supplier_id,
         ordered.received_quantity, ordered.received_cost
    from public.purchase_order_items as ordered
   where ordered.order_id = p_order_id
     and ordered.ingredient_id is not null
     and ordered.received_quantity > 0;

  update public.products as p
     set stock_quantity = coalesce(p.stock_quantity, 0) + ordered.received_quantity::integer
    from public.purchase_order_items as ordered
   where ordered.order_id = p_order_id
     and ordered.product_id = p.id
     and ordered.received_quantity > 0;

  insert into public.product_stock_movements (organization_id, product_id, quantity)
  select v_order.organization_id, ordered.product_id, ordered.received_quantity::integer
    from public.purchase_order_items as ordered
   where ordered.order_id = p_order_id
     and ordered.product_id is not null
     and ordered.received_quantity > 0;

  select coalesce(sum(received_cost), 0) into v_total
    from public.purchase_order_items
   where order_id = p_order_id
     and received_quantity > 0;

  if p_payment_due_date is not null and v_total > 0 then
    select name into v_supplier_name from public.suppliers where id = v_order.supplier_id;
    v_today := public.organization_today(v_order.organization_id);

    insert into public.financial_entries (
      organization_id, kind, description, amount, due_date, category_id,
      supplier_id, account_id, source, source_key, source_date, paid_at, paid_amount
    )
    values (
      v_order.organization_id,
      'expense',
      'Pedido de compra' || coalesce(' · ' || v_supplier_name, ''),
      v_total,
      p_payment_due_date,
      (select id from public.financial_categories
        where organization_id = v_order.organization_id
          and kind = 'expense'
          and name = 'Insumos e mercadorias'
        limit 1),
      v_order.supplier_id,
      (select id from public.financial_accounts
        where organization_id = v_order.organization_id
          and not is_archived
        order by created_at
        limit 1),
      'stock_purchase',
      'purchase-order:' || p_order_id,
      v_today,
      case when p_payment_due_date <= v_today then p_payment_due_date end,
      case when p_payment_due_date <= v_today then v_total end
    );
  end if;

  update public.purchase_orders
     set status = 'received',
         received_at = now(),
         received_by_name = public.current_person_name(v_order.organization_id)
   where id = p_order_id;

  return v_total;
end;
$$;
