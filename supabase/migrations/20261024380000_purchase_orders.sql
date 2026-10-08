create type public.purchase_order_status as enum ('pending', 'received', 'canceled');

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid,
  status public.purchase_order_status not null default 'pending',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_by_name text,
  received_at timestamptz,
  received_by_name text,
  unique (id, organization_id),
  foreign key (supplier_id, organization_id)
    references public.suppliers (id, organization_id) on delete set null (supplier_id)
);

create index purchase_orders_organization_status_idx
  on public.purchase_orders (organization_id, status, created_at desc);

create table public.purchase_order_items (
  order_id uuid not null,
  ingredient_id uuid not null,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quantity numeric(14, 3) not null check (quantity > 0),
  received_quantity numeric(14, 3) check (received_quantity >= 0),
  received_cost numeric(12, 2) check (received_cost >= 0),
  primary key (order_id, ingredient_id),
  foreign key (order_id, organization_id)
    references public.purchase_orders (id, organization_id) on delete cascade,
  foreign key (ingredient_id, organization_id)
    references public.ingredients (id, organization_id) on delete cascade
);

create index purchase_order_items_ingredient_id_idx
  on public.purchase_order_items (ingredient_id);

alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

create policy "purchase_orders: members read" on public.purchase_orders
  for select to authenticated using (public.is_member(organization_id));

create policy "purchase_order_items: members read" on public.purchase_order_items
  for select to authenticated using (public.is_member(organization_id));

create function public.current_person_name(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.current_operator_name(p_organization_id),
    (select full_name from public.profiles where id = auth.uid())
  );
$$;

revoke execute on function public.current_person_name from public, anon;
grant execute on function public.current_person_name to authenticated;

create function public.create_purchase_order(
  p_organization_id uuid,
  p_supplier_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_item_count integer;
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

  get diagnostics v_item_count = row_count;

  if v_item_count = 0 then
    raise exception 'purchase order has no items' using errcode = '22023';
  end if;

  return v_order_id;
end;
$$;

revoke execute on function public.create_purchase_order from public, anon;
grant execute on function public.create_purchase_order to authenticated;

create function public.receive_purchase_order(
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
    coalesce((item ->> 'quantity')::numeric, 0) as quantity,
    coalesce((item ->> 'total_cost')::numeric, 0) as total_cost
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item;

  if exists (select 1 from received_items where quantity < 0 or total_cost < 0) then
    raise exception 'invalid received item' using errcode = '22023';
  end if;

  if not exists (
    select 1 from received_items as received
      join public.purchase_order_items as ordered
        on ordered.order_id = p_order_id
       and ordered.ingredient_id = received.ingredient_id
     where received.quantity > 0
  ) then
    raise exception 'nothing received' using errcode = '22023';
  end if;

  update public.purchase_order_items as ordered
     set received_quantity = received.quantity,
         received_cost = received.total_cost
    from received_items as received
   where ordered.order_id = p_order_id
     and ordered.ingredient_id = received.ingredient_id;

  insert into public.stock_entries (
    organization_id, ingredient_id, supplier_id, quantity, total_cost
  )
  select v_order.organization_id, ordered.ingredient_id, v_order.supplier_id,
         ordered.received_quantity, ordered.received_cost
    from public.purchase_order_items as ordered
   where ordered.order_id = p_order_id
     and ordered.received_quantity > 0;

  select coalesce(sum(received_cost), 0) into v_total
    from public.purchase_order_items
   where order_id = p_order_id
     and received_quantity > 0;

  if p_payment_due_date is not null and v_total > 0 then
    select name into v_supplier_name from public.suppliers where id = v_order.supplier_id;

    insert into public.financial_entries (
      organization_id, kind, description, amount, due_date, category_id,
      supplier_id, account_id, source, source_key, source_date
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
      public.organization_today(v_order.organization_id)
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

revoke execute on function public.receive_purchase_order from public, anon;
grant execute on function public.receive_purchase_order to authenticated;

create function public.cancel_purchase_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  select organization_id into v_organization_id
    from public.purchase_orders
   where id = p_order_id;

  if v_organization_id is null or not public.is_member(v_organization_id) then
    raise exception 'purchase order not found' using errcode = 'P0002';
  end if;

  update public.purchase_orders
     set status = 'canceled'
   where id = p_order_id
     and status = 'pending';
end;
$$;

revoke execute on function public.cancel_purchase_order from public, anon;
grant execute on function public.cancel_purchase_order to authenticated;
