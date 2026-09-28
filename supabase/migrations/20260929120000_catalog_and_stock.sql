create type public.measure_unit as enum ('unit', 'g', 'kg', 'ml', 'l');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index categories_organization_name_key
  on public.categories (organization_id, lower(name));

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  document text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create index suppliers_organization_id_idx on public.suppliers (organization_id);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  unit public.measure_unit not null,
  current_stock numeric(14, 3) not null default 0,
  minimum_stock numeric(14, 3) not null default 0 check (minimum_stock >= 0),
  unit_cost numeric(14, 6) not null default 0 check (unit_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index ingredients_organization_name_key
  on public.ingredients (organization_id, lower(name));

create table public.stock_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ingredient_id uuid not null,
  supplier_id uuid,
  quantity numeric(14, 3) not null check (quantity > 0),
  total_cost numeric(12, 2) not null check (total_cost >= 0),
  entered_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (ingredient_id, organization_id)
    references public.ingredients (id, organization_id) on delete cascade,
  foreign key (supplier_id, organization_id)
    references public.suppliers (id, organization_id) on delete set null (supplier_id)
);

create index stock_entries_ingredient_id_idx on public.stock_entries (ingredient_id);
create index stock_entries_organization_id_idx on public.stock_entries (organization_id, entered_at desc);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 80),
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (category_id, organization_id)
    references public.categories (id, organization_id) on delete set null (category_id)
);

create index products_organization_id_idx on public.products (organization_id);
create index products_category_id_idx on public.products (category_id);

create table public.product_ingredients (
  product_id uuid not null,
  ingredient_id uuid not null,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quantity numeric(14, 3) not null check (quantity > 0),
  primary key (product_id, ingredient_id),
  foreign key (product_id, organization_id)
    references public.products (id, organization_id) on delete cascade,
  foreign key (ingredient_id, organization_id)
    references public.ingredients (id, organization_id) on delete restrict
);

create index product_ingredients_ingredient_id_idx on public.product_ingredients (ingredient_id);

create view public.product_costs
with (security_invoker = true)
as
select
  p.id as product_id,
  p.organization_id,
  coalesce(sum(pi.quantity * i.unit_cost), 0)::numeric(14, 4) as unit_cost
from public.products p
left join public.product_ingredients pi on pi.product_id = p.id
left join public.ingredients i on i.id = pi.ingredient_id
group by p.id, p.organization_id;

create function public.apply_stock_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_stock numeric;
  v_cost numeric;
begin
  select greatest(current_stock, 0), unit_cost
    into v_stock, v_cost
    from public.ingredients
   where id = new.ingredient_id
     and organization_id = new.organization_id
     for update;

  if not found then
    raise exception 'ingredient does not belong to organization' using errcode = '23503';
  end if;

  update public.ingredients
     set unit_cost = (v_stock * v_cost + new.total_cost) / (v_stock + new.quantity),
         current_stock = current_stock + new.quantity
   where id = new.ingredient_id;

  return new;
end;
$$;

create trigger stock_entries_apply
  after insert on public.stock_entries
  for each row execute function public.apply_stock_entry();

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

create trigger ingredients_updated_at
  before update on public.ingredients
  for each row execute function public.set_updated_at();

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'categories',
    'suppliers',
    'ingredients',
    'stock_entries',
    'products',
    'product_ingredients'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);

    execute format(
      'create policy "%1$s: members read" on public.%1$I for select to authenticated
         using (public.is_member(organization_id))',
      v_table
    );

    execute format(
      'create policy "%1$s: managers insert" on public.%1$I for insert to authenticated
         with check (public.has_role(organization_id, array[''owner'', ''manager'']::public.member_role[]))',
      v_table
    );

    execute format(
      'create policy "%1$s: managers update" on public.%1$I for update to authenticated
         using (public.has_role(organization_id, array[''owner'', ''manager'']::public.member_role[]))
         with check (public.has_role(organization_id, array[''owner'', ''manager'']::public.member_role[]))',
      v_table
    );

    execute format(
      'create policy "%1$s: managers delete" on public.%1$I for delete to authenticated
         using (public.has_role(organization_id, array[''owner'', ''manager'']::public.member_role[]))',
      v_table
    );
  end loop;
end;
$$;
