alter table public.products
  add column stock_quantity integer;

create table public.product_stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  quantity integer not null,
  created_at timestamptz not null default now()
);

create index product_stock_movements_order_id_idx
  on public.product_stock_movements (order_id);

create index product_stock_movements_product_id_idx
  on public.product_stock_movements (product_id);

alter table public.product_stock_movements enable row level security;

create policy "product_stock_movements: members read" on public.product_stock_movements
  for select to authenticated
  using (public.is_member(organization_id));

create or replace function public.move_order_stock(
  p_organization_id uuid,
  p_order_id uuid,
  p_items jsonb,
  p_is_return boolean,
  p_allow_negative boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  drop table if exists stock_changes;
  drop table if exists product_stock_changes;

  create temporary table stock_changes on commit drop as
  select usage.ingredient_id, sum(usage.quantity) as quantity
    from (
      select pi.ingredient_id, pi.quantity * (item ->> 'quantity')::numeric as quantity
        from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
        join public.product_ingredients as pi on pi.product_id = (item ->> 'product_id')::uuid
      union all
      select a.ingredient_id, a.ingredient_quantity * (item ->> 'quantity')::numeric
        from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
        cross join lateral unnest(public.normalize_addon_ids(item -> 'addon_ids')) as addon(id)
        join public.product_addons as a on a.id = addon.id
       where a.ingredient_id is not null
    ) as usage
   group by usage.ingredient_id;

  create temporary table product_stock_changes on commit drop as
  select p.id as product_id, sum((item ->> 'quantity')::integer) as quantity
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
    join public.products as p
      on p.id = (item ->> 'product_id')::uuid
     and p.organization_id = p_organization_id
     and p.stock_quantity is not null
   group by p.id;

  if not p_is_return then
    perform 1
       from public.ingredients as i
       join stock_changes as change on change.ingredient_id = i.id
      where i.organization_id = p_organization_id
        for update of i;

    perform 1
       from public.products as p
       join product_stock_changes as change on change.product_id = p.id
        for update of p;

    if not coalesce(p_allow_negative, false) and exists (
      select 1
        from stock_changes as change
        join public.ingredients as i on i.id = change.ingredient_id
       where i.current_stock < change.quantity
    ) then
      raise exception 'insufficient stock' using errcode = 'TB001';
    end if;

    if not coalesce(p_allow_negative, false) and exists (
      select 1
        from product_stock_changes as change
        join public.products as p on p.id = change.product_id
       where p.stock_quantity < change.quantity
    ) then
      raise exception 'insufficient product stock' using errcode = 'TB044';
    end if;
  end if;

  update public.ingredients as i
     set current_stock = i.current_stock
       + case when p_is_return then change.quantity else -change.quantity end
    from stock_changes as change
   where i.id = change.ingredient_id
     and i.organization_id = p_organization_id;

  insert into public.stock_movements (organization_id, ingredient_id, order_id, quantity)
  select
    p_organization_id,
    change.ingredient_id,
    p_order_id,
    case when p_is_return then change.quantity else -change.quantity end
    from stock_changes as change;

  update public.products as p
     set stock_quantity = p.stock_quantity
       + case when p_is_return then change.quantity else -change.quantity end
    from product_stock_changes as change
   where p.id = change.product_id;

  insert into public.product_stock_movements (organization_id, product_id, order_id, quantity)
  select
    p_organization_id,
    change.product_id,
    p_order_id,
    case when p_is_return then change.quantity else -change.quantity end
    from product_stock_changes as change;

  drop table stock_changes;
  drop table product_stock_changes;
end;
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  v_order := public.lock_open_order(p_order_id);

  update public.ingredients as i
     set current_stock = i.current_stock - movement.net_quantity
    from (
      select ingredient_id, sum(quantity) as net_quantity
        from public.stock_movements
       where order_id = p_order_id
       group by ingredient_id
      having sum(quantity) <> 0
    ) as movement
   where i.id = movement.ingredient_id
     and i.organization_id = v_order.organization_id;

  insert into public.stock_movements (organization_id, ingredient_id, order_id, quantity)
  select v_order.organization_id, ingredient_id, p_order_id, -sum(quantity)
    from public.stock_movements
   where order_id = p_order_id
   group by ingredient_id
  having sum(quantity) <> 0;

  update public.products as p
     set stock_quantity = p.stock_quantity - movement.net_quantity
    from (
      select product_id, sum(quantity) as net_quantity
        from public.product_stock_movements
       where order_id = p_order_id
       group by product_id
      having sum(quantity) <> 0
    ) as movement
   where p.id = movement.product_id
     and p.organization_id = v_order.organization_id
     and p.stock_quantity is not null;

  insert into public.product_stock_movements (organization_id, product_id, order_id, quantity)
  select v_order.organization_id, product_id, p_order_id, -sum(quantity)
    from public.product_stock_movements
   where order_id = p_order_id
   group by product_id
  having sum(quantity) <> 0;

  update public.orders set status = 'canceled' where id = p_order_id;
end;
$$;
