create type public.order_status as enum ('in_kitchen', 'ready', 'completed', 'canceled');

create type public.payment_method as enum ('cash', 'pix', 'credit_card', 'debit_card');

alter table public.organizations
  add column last_order_number integer not null default 0;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  number integer not null,
  status public.order_status not null,
  note text check (char_length(note) <= 500),
  total numeric(12, 2) not null check (total >= 0),
  payment_method public.payment_method,
  amount_received numeric(12, 2) check (amount_received >= 0),
  paid_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (id, organization_id)
);

create index orders_organization_created_at_idx
  on public.orders (organization_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null,
  product_id uuid,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  foreign key (order_id, organization_id)
    references public.orders (id, organization_id) on delete cascade,
  foreign key (product_id, organization_id)
    references public.products (id, organization_id) on delete set null (product_id)
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ingredient_id uuid not null,
  order_id uuid,
  quantity numeric(14, 3) not null,
  created_at timestamptz not null default now(),
  foreign key (ingredient_id, organization_id)
    references public.ingredients (id, organization_id) on delete cascade,
  foreign key (order_id, organization_id)
    references public.orders (id, organization_id) on delete set null (order_id)
);

create index stock_movements_order_id_idx on public.stock_movements (order_id);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_movements enable row level security;

create policy "orders: members read" on public.orders
  for select to authenticated using (public.is_member(organization_id));

create policy "order_items: members read" on public.order_items
  for select to authenticated using (public.is_member(organization_id));

create policy "stock_movements: members read" on public.stock_movements
  for select to authenticated using (public.is_member(organization_id));

create function public.place_order(
  p_organization_id uuid,
  p_items jsonb,
  p_note text default null,
  p_payment_method public.payment_method default null,
  p_amount_received numeric default null
)
returns table (order_id uuid, order_number integer, order_total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_number integer;
  v_total numeric(12, 2);
  v_item_count integer;
  v_valid_item_count integer;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  create temporary table requested_items on commit drop as
  select
    (item ->> 'product_id')::uuid as product_id,
    sum((item ->> 'quantity')::integer) as quantity
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  group by 1;

  select count(*) into v_item_count from requested_items;

  if v_item_count = 0 then
    raise exception 'order has no items' using errcode = '22023';
  end if;

  if exists (select 1 from requested_items where quantity is null or quantity <= 0) then
    raise exception 'invalid item quantity' using errcode = '22023';
  end if;

  select count(*), coalesce(sum(p.price * requested.quantity), 0)
    into v_valid_item_count, v_total
    from requested_items as requested
    join public.products as p
      on p.id = requested.product_id
     and p.organization_id = p_organization_id
     and p.is_active;

  if v_valid_item_count <> v_item_count then
    raise exception 'unavailable product in order' using errcode = 'P0002';
  end if;

  if p_payment_method = 'cash' and coalesce(p_amount_received, 0) < v_total then
    raise exception 'amount received is lower than total' using errcode = '22023';
  end if;

  update public.organizations
     set last_order_number = last_order_number + 1
   where id = p_organization_id
  returning last_order_number into v_order_number;

  insert into public.orders (
    organization_id, number, status, note, total, payment_method, amount_received, paid_at
  )
  values (
    p_organization_id,
    v_order_number,
    case when p_payment_method is null then 'in_kitchen' else 'completed' end::public.order_status,
    nullif(trim(p_note), ''),
    v_total,
    p_payment_method,
    case when p_payment_method = 'cash' then p_amount_received end,
    case when p_payment_method is not null then now() end
  )
  returning id into v_order_id;

  insert into public.order_items (
    organization_id, order_id, product_id, product_name, quantity, unit_price
  )
  select p_organization_id, v_order_id, p.id, p.name, requested.quantity, p.price
    from requested_items as requested
    join public.products as p on p.id = requested.product_id;

  create temporary table consumed_ingredients on commit drop as
  select pi.ingredient_id, sum(pi.quantity * requested.quantity) as quantity
    from requested_items as requested
    join public.product_ingredients as pi on pi.product_id = requested.product_id
   group by pi.ingredient_id;

  update public.ingredients as i
     set current_stock = i.current_stock - consumed.quantity
    from consumed_ingredients as consumed
   where i.id = consumed.ingredient_id
     and i.organization_id = p_organization_id;

  insert into public.stock_movements (organization_id, ingredient_id, order_id, quantity)
  select p_organization_id, consumed.ingredient_id, v_order_id, -consumed.quantity
    from consumed_ingredients as consumed;

  return query select v_order_id, v_order_number, v_total;
end;
$$;

revoke execute on function public.place_order from public, anon;
grant execute on function public.place_order to authenticated;
