alter table public.ingredients
  add column is_prepared boolean not null default false,
  add column yield_quantity numeric(14, 3) check (yield_quantity > 0),
  add constraint ingredients_prepared_yield_check
    check (not is_prepared or yield_quantity is not null);

create table public.ingredient_components (
  prepared_ingredient_id uuid not null,
  component_ingredient_id uuid not null,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quantity numeric(14, 3) not null check (quantity > 0),
  primary key (prepared_ingredient_id, component_ingredient_id),
  check (prepared_ingredient_id <> component_ingredient_id),
  foreign key (prepared_ingredient_id, organization_id)
    references public.ingredients (id, organization_id) on delete cascade,
  foreign key (component_ingredient_id, organization_id)
    references public.ingredients (id, organization_id) on delete restrict
);

create index ingredient_components_component_idx
  on public.ingredient_components (component_ingredient_id);

create table public.production_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ingredient_id uuid not null,
  batches numeric(10, 3) not null check (batches > 0),
  expected_quantity numeric(14, 3) not null,
  produced_quantity numeric(14, 3) not null check (produced_quantity >= 0),
  total_cost numeric(14, 4) not null,
  produced_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_by_name text,
  unique (id, organization_id),
  foreign key (ingredient_id, organization_id)
    references public.ingredients (id, organization_id) on delete cascade
);

create index production_batches_organization_idx
  on public.production_batches (organization_id, produced_at desc);

alter table public.stock_movements
  add column production_batch_id uuid references public.production_batches (id) on delete set null;

alter table public.ingredient_components enable row level security;
alter table public.production_batches enable row level security;

create policy "ingredient_components: members read" on public.ingredient_components
  for select to authenticated using (public.is_member(organization_id));

create policy "production_batches: members read" on public.production_batches
  for select to authenticated using (public.is_member(organization_id));

create function public.save_prepared_recipe(
  p_ingredient_id uuid,
  p_is_prepared boolean,
  p_yield_quantity numeric,
  p_components jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingredient public.ingredients;
  v_theoretical_cost numeric;
begin
  select * into v_ingredient
    from public.ingredients
   where id = p_ingredient_id
     for update;

  if not found then
    raise exception 'ingredient not found' using errcode = 'P0002';
  end if;

  if not public.has_role(v_ingredient.organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed to change recipes' using errcode = '42501';
  end if;

  delete from public.ingredient_components
   where prepared_ingredient_id = p_ingredient_id;

  if not coalesce(p_is_prepared, false) then
    update public.ingredients
       set is_prepared = false,
           yield_quantity = null
     where id = p_ingredient_id;
    return;
  end if;

  if coalesce(p_yield_quantity, 0) <= 0 then
    raise exception 'invalid yield' using errcode = '22023';
  end if;

  insert into public.ingredient_components (
    prepared_ingredient_id, component_ingredient_id, organization_id, quantity
  )
  select p_ingredient_id, component.id, v_ingredient.organization_id, sum((item ->> 'quantity')::numeric)
    from jsonb_array_elements(coalesce(p_components, '[]'::jsonb)) as item
    join public.ingredients as component
      on component.id = (item ->> 'ingredient_id')::uuid
     and component.organization_id = v_ingredient.organization_id
   where (item ->> 'quantity')::numeric > 0
   group by component.id;

  if not exists (
    select 1 from public.ingredient_components
     where prepared_ingredient_id = p_ingredient_id
  ) then
    raise exception 'prepared ingredient needs components' using errcode = '22023';
  end if;

  if exists (
    with recursive chain (ingredient_id) as (
      select component_ingredient_id
        from public.ingredient_components
       where prepared_ingredient_id = p_ingredient_id
      union
      select ic.component_ingredient_id
        from public.ingredient_components as ic
        join chain on chain.ingredient_id = ic.prepared_ingredient_id
    )
    select 1 from chain where ingredient_id = p_ingredient_id
  ) then
    raise exception 'recipe cycle' using errcode = 'TB035';
  end if;

  select coalesce(sum(ic.quantity * component.unit_cost), 0) / p_yield_quantity
    into v_theoretical_cost
    from public.ingredient_components as ic
    join public.ingredients as component on component.id = ic.component_ingredient_id
   where ic.prepared_ingredient_id = p_ingredient_id;

  update public.ingredients
     set is_prepared = true,
         yield_quantity = p_yield_quantity,
         unit_cost = case when current_stock <= 0 then v_theoretical_cost else unit_cost end
   where id = p_ingredient_id;
end;
$$;

revoke execute on function public.save_prepared_recipe from public, anon;
grant execute on function public.save_prepared_recipe to authenticated;

create function public.register_production(
  p_ingredient_id uuid,
  p_batches numeric,
  p_produced_quantity numeric default null
)
returns table (batch_id uuid, produced_quantity numeric, total_cost numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingredient public.ingredients;
  v_expected numeric;
  v_produced numeric;
  v_total_cost numeric;
  v_batch_id uuid;
  v_stock numeric;
begin
  select * into v_ingredient
    from public.ingredients
   where id = p_ingredient_id
     for update;

  if not found or not public.is_member(v_ingredient.organization_id) then
    raise exception 'ingredient not found' using errcode = 'P0002';
  end if;

  if not v_ingredient.is_prepared then
    raise exception 'ingredient is not prepared' using errcode = 'TB036';
  end if;

  if coalesce(p_batches, 0) <= 0 then
    raise exception 'invalid batches' using errcode = '22023';
  end if;

  perform 1
     from public.ingredients as component
     join public.ingredient_components as ic on ic.component_ingredient_id = component.id
    where ic.prepared_ingredient_id = p_ingredient_id
      for update of component;

  v_expected := v_ingredient.yield_quantity * p_batches;
  v_produced := coalesce(p_produced_quantity, v_expected);

  if v_produced < 0 then
    raise exception 'invalid produced quantity' using errcode = '22023';
  end if;

  select coalesce(sum(ic.quantity * p_batches * component.unit_cost), 0)
    into v_total_cost
    from public.ingredient_components as ic
    join public.ingredients as component on component.id = ic.component_ingredient_id
   where ic.prepared_ingredient_id = p_ingredient_id;

  insert into public.production_batches (
    organization_id, ingredient_id, batches, expected_quantity, produced_quantity,
    total_cost, created_by_name
  )
  values (
    v_ingredient.organization_id, p_ingredient_id, p_batches, v_expected, v_produced,
    v_total_cost, public.current_person_name(v_ingredient.organization_id)
  )
  returning id into v_batch_id;

  update public.ingredients as component
     set current_stock = component.current_stock - ic.quantity * p_batches
    from public.ingredient_components as ic
   where ic.prepared_ingredient_id = p_ingredient_id
     and component.id = ic.component_ingredient_id;

  insert into public.stock_movements (organization_id, ingredient_id, quantity, production_batch_id)
  select v_ingredient.organization_id, ic.component_ingredient_id, -(ic.quantity * p_batches), v_batch_id
    from public.ingredient_components as ic
   where ic.prepared_ingredient_id = p_ingredient_id;

  if v_produced > 0 then
    v_stock := greatest(v_ingredient.current_stock, 0);

    update public.ingredients
       set unit_cost = (v_stock * v_ingredient.unit_cost + v_total_cost) / (v_stock + v_produced),
           current_stock = current_stock + v_produced
     where id = p_ingredient_id;

    insert into public.stock_movements (organization_id, ingredient_id, quantity, production_batch_id)
    values (v_ingredient.organization_id, p_ingredient_id, v_produced, v_batch_id);
  end if;

  return query select v_batch_id, v_produced, v_total_cost;
end;
$$;

revoke execute on function public.register_production from public, anon;
grant execute on function public.register_production to authenticated;
