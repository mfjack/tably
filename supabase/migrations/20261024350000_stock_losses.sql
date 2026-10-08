create type public.stock_loss_reason as enum ('expired', 'spoiled', 'preparation_error', 'dropped', 'other');

create table public.stock_losses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ingredient_id uuid not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  reason public.stock_loss_reason not null,
  note text check (char_length(note) <= 200),
  unit_cost numeric(14, 4) not null,
  loss_date date not null,
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (ingredient_id, organization_id)
    references public.ingredients (id, organization_id) on delete cascade
);

create index stock_losses_organization_date_idx
  on public.stock_losses (organization_id, loss_date desc);

create index stock_losses_ingredient_id_idx on public.stock_losses (ingredient_id);

alter table public.stock_movements
  add column stock_loss_id uuid references public.stock_losses (id) on delete set null;

alter table public.stock_losses enable row level security;

create policy "stock_losses: members read" on public.stock_losses
  for select to authenticated using (public.is_member(organization_id));

create function public.register_stock_loss(
  p_organization_id uuid,
  p_ingredient_id uuid,
  p_quantity numeric,
  p_reason public.stock_loss_reason,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingredient public.ingredients;
  v_loss_id uuid;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  if coalesce(p_quantity, 0) <= 0 then
    raise exception 'invalid loss quantity' using errcode = '22023';
  end if;

  select * into v_ingredient
    from public.ingredients
   where id = p_ingredient_id
     and organization_id = p_organization_id
     for update;

  if not found then
    raise exception 'ingredient not found' using errcode = 'P0002';
  end if;

  insert into public.stock_losses (
    organization_id, ingredient_id, quantity, reason, note, unit_cost,
    loss_date, created_by, created_by_name
  )
  values (
    p_organization_id,
    p_ingredient_id,
    p_quantity,
    p_reason,
    nullif(trim(p_note), ''),
    v_ingredient.unit_cost,
    public.organization_today(p_organization_id),
    auth.uid(),
    coalesce(
      public.current_operator_name(p_organization_id),
      (select full_name from public.profiles where id = auth.uid())
    )
  )
  returning id into v_loss_id;

  update public.ingredients
     set current_stock = current_stock - p_quantity
   where id = p_ingredient_id;

  insert into public.stock_movements (organization_id, ingredient_id, quantity, stock_loss_id)
  values (p_organization_id, p_ingredient_id, -p_quantity, v_loss_id);

  return v_loss_id;
end;
$$;

revoke execute on function public.register_stock_loss from public, anon;
grant execute on function public.register_stock_loss to authenticated;
