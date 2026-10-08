create table public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  counted_at timestamptz not null default now(),
  counted_by uuid references auth.users (id) on delete set null,
  counted_by_name text,
  difference_value numeric(14, 2) not null default 0,
  unique (id, organization_id)
);

create index stock_counts_organization_id_idx
  on public.stock_counts (organization_id, counted_at desc);

create table public.stock_count_items (
  count_id uuid not null,
  ingredient_id uuid not null,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  system_quantity numeric(14, 3) not null,
  counted_quantity numeric(14, 3) not null check (counted_quantity >= 0),
  unit_cost numeric(14, 4) not null,
  primary key (count_id, ingredient_id),
  foreign key (count_id, organization_id)
    references public.stock_counts (id, organization_id) on delete cascade,
  foreign key (ingredient_id, organization_id)
    references public.ingredients (id, organization_id) on delete cascade
);

create index stock_count_items_ingredient_id_idx
  on public.stock_count_items (ingredient_id);

alter table public.stock_movements
  add column stock_count_id uuid references public.stock_counts (id) on delete set null;

alter table public.stock_counts enable row level security;
alter table public.stock_count_items enable row level security;

create policy "stock_counts: members read" on public.stock_counts
  for select to authenticated using (public.is_member(organization_id));

create policy "stock_count_items: members read" on public.stock_count_items
  for select to authenticated using (public.is_member(organization_id));

create function public.apply_stock_count(p_organization_id uuid, p_counts jsonb)
returns table (count_id uuid, adjusted_count integer, difference_value numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count_id uuid;
  v_adjusted_count integer;
  v_difference_value numeric(14, 2);
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed to count stock' using errcode = '42501';
  end if;

  drop table if exists counted_items;

  create temporary table counted_items on commit drop as
  select distinct on ((entry ->> 'ingredient_id')::uuid)
    (entry ->> 'ingredient_id')::uuid as ingredient_id,
    (entry ->> 'counted_quantity')::numeric as counted_quantity
  from jsonb_array_elements(coalesce(p_counts, '[]'::jsonb)) as entry;

  if not exists (select 1 from counted_items) then
    raise exception 'stock count has no items' using errcode = '22023';
  end if;

  if exists (
    select 1 from counted_items
     where counted_quantity is null or counted_quantity < 0
  ) then
    raise exception 'invalid counted quantity' using errcode = '22023';
  end if;

  perform 1
     from public.ingredients as i
     join counted_items as counted on counted.ingredient_id = i.id
    where i.organization_id = p_organization_id
      for update of i;

  if (
    select count(*)
      from counted_items as counted
      join public.ingredients as i
        on i.id = counted.ingredient_id
       and i.organization_id = p_organization_id
  ) <> (select count(*) from counted_items) then
    raise exception 'ingredient not found' using errcode = 'P0002';
  end if;

  insert into public.stock_counts (organization_id, counted_by, counted_by_name)
  values (
    p_organization_id,
    auth.uid(),
    coalesce(
      public.current_operator_name(p_organization_id),
      (select full_name from public.profiles where id = auth.uid())
    )
  )
  returning id into v_count_id;

  insert into public.stock_count_items (
    count_id, ingredient_id, organization_id, system_quantity, counted_quantity, unit_cost
  )
  select v_count_id, i.id, p_organization_id, i.current_stock, counted.counted_quantity, i.unit_cost
    from counted_items as counted
    join public.ingredients as i on i.id = counted.ingredient_id;

  insert into public.stock_movements (organization_id, ingredient_id, quantity, stock_count_id)
  select p_organization_id, item.ingredient_id, item.counted_quantity - item.system_quantity, v_count_id
    from public.stock_count_items as item
   where item.count_id = v_count_id
     and item.counted_quantity <> item.system_quantity;

  get diagnostics v_adjusted_count = row_count;

  update public.ingredients as i
     set current_stock = item.counted_quantity
    from public.stock_count_items as item
   where item.count_id = v_count_id
     and item.ingredient_id = i.id
     and item.counted_quantity <> item.system_quantity;

  select coalesce(sum((item.counted_quantity - item.system_quantity) * item.unit_cost), 0)
    into v_difference_value
    from public.stock_count_items as item
   where item.count_id = v_count_id;

  update public.stock_counts
     set difference_value = v_difference_value
   where id = v_count_id;

  return query select v_count_id, v_adjusted_count, v_difference_value;
end;
$$;

revoke execute on function public.apply_stock_count from public, anon;
grant execute on function public.apply_stock_count to authenticated;
