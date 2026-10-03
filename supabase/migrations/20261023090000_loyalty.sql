alter type public.app_module add value if not exists 'loyalty';

create table public.loyalty_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  is_enabled boolean not null default false,
  stamps_required integer not null default 10 check (stamps_required between 2 and 50),
  minimum_purchase numeric(12, 2) not null default 0 check (minimum_purchase >= 0),
  reward_description text not null default '' check (char_length(reward_description) <= 80),
  reward_value numeric(12, 2) not null default 0 check (reward_value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger loyalty_settings_updated_at
  before update on public.loyalty_settings
  for each row execute function public.set_updated_at();

alter table public.loyalty_settings enable row level security;

create policy "loyalty_settings: members read" on public.loyalty_settings
  for select to authenticated
  using (public.is_member(organization_id));

create policy "loyalty_settings: managers write" on public.loyalty_settings
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create table public.loyalty_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  phone text not null check (phone ~ '^[0-9]{10,11}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, phone),
  unique (id, organization_id)
);

create trigger loyalty_customers_updated_at
  before update on public.loyalty_customers
  for each row execute function public.set_updated_at();

alter table public.loyalty_customers enable row level security;

create policy "loyalty_customers: members read" on public.loyalty_customers
  for select to authenticated
  using (public.is_member(organization_id));

create policy "loyalty_customers: managers insert" on public.loyalty_customers
  for insert to authenticated
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "loyalty_customers: managers update" on public.loyalty_customers
  for update to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "loyalty_customers: managers delete" on public.loyalty_customers
  for delete to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create type public.loyalty_transaction_kind as enum ('earn', 'redeem', 'adjust');

create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null,
  order_id uuid references public.orders (id) on delete set null,
  kind public.loyalty_transaction_kind not null,
  stamps integer not null check (stamps <> 0),
  note text check (char_length(note) <= 200),
  created_by_name text,
  created_at timestamptz not null default now(),
  foreign key (customer_id, organization_id)
    references public.loyalty_customers (id, organization_id) on delete cascade
);

create index loyalty_transactions_customer_idx
  on public.loyalty_transactions (customer_id, created_at desc);

create unique index loyalty_transactions_order_kind_idx
  on public.loyalty_transactions (order_id, kind)
  where order_id is not null;

alter table public.loyalty_transactions enable row level security;

create policy "loyalty_transactions: members read" on public.loyalty_transactions
  for select to authenticated
  using (public.is_member(organization_id));

create function public.get_loyalty_balance(p_customer_id uuid)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(stamps), 0)::integer
    from public.loyalty_transactions
   where customer_id = p_customer_id;
$$;

create function public.list_loyalty_customers(p_organization_id uuid)
returns table (
  id uuid,
  name text,
  phone text,
  balance integer,
  total_earned integer,
  total_redeemed integer,
  last_visit_at timestamptz,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    customer.id,
    customer.name,
    customer.phone,
    coalesce(sum(transaction.stamps), 0)::integer,
    coalesce(sum(transaction.stamps) filter (where transaction.kind = 'earn'), 0)::integer,
    coalesce(count(*) filter (where transaction.kind = 'redeem'), 0)::integer,
    max(transaction.created_at) filter (where transaction.kind in ('earn', 'redeem')),
    customer.created_at
  from public.loyalty_customers as customer
  left join public.loyalty_transactions as transaction
    on transaction.customer_id = customer.id
  where customer.organization_id = p_organization_id
  group by customer.id
  order by max(transaction.created_at) desc nulls last, customer.name;
$$;

create function public.record_loyalty_purchase(
  p_order_id uuid,
  p_phone text,
  p_name text default null,
  p_redeem boolean default false,
  p_created_by_name text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_settings public.loyalty_settings;
  v_customer_id uuid;
  v_balance integer;
  v_name text := nullif(trim(coalesce(p_name, '')), '');
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found or not public.is_member(v_order.organization_id) then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if v_order.paid_at is null then
    raise exception 'order is not paid' using errcode = '22023';
  end if;

  select * into v_settings
    from public.loyalty_settings
   where organization_id = v_order.organization_id;

  if not found or not v_settings.is_enabled then
    raise exception 'loyalty is disabled' using errcode = 'TB020';
  end if;

  if p_phone !~ '^[0-9]{10,11}$' then
    raise exception 'invalid phone' using errcode = '22023';
  end if;

  select id into v_customer_id
    from public.loyalty_customers
   where organization_id = v_order.organization_id
     and phone = p_phone;

  if v_customer_id is null then
    if v_name is null then
      raise exception 'customer name is required' using errcode = 'TB021';
    end if;

    insert into public.loyalty_customers (organization_id, name, phone)
    values (v_order.organization_id, v_name, p_phone)
    returning id into v_customer_id;
  end if;

  perform pg_advisory_xact_lock(hashtext('loyalty:' || v_customer_id::text));

  if p_redeem then
    v_balance := public.get_loyalty_balance(v_customer_id);
    if v_balance < v_settings.stamps_required then
      raise exception 'not enough stamps' using errcode = 'TB022';
    end if;

    insert into public.loyalty_transactions (
      organization_id, customer_id, order_id, kind, stamps, note, created_by_name
    )
    values (
      v_order.organization_id,
      v_customer_id,
      p_order_id,
      'redeem',
      -v_settings.stamps_required,
      nullif(v_settings.reward_description, ''),
      p_created_by_name
    )
    on conflict (order_id, kind) where order_id is not null do nothing;
  end if;

  if v_order.total >= v_settings.minimum_purchase then
    insert into public.loyalty_transactions (
      organization_id, customer_id, order_id, kind, stamps, created_by_name
    )
    values (v_order.organization_id, v_customer_id, p_order_id, 'earn', 1, p_created_by_name)
    on conflict (order_id, kind) where order_id is not null do nothing;
  end if;

  return public.get_loyalty_balance(v_customer_id);
end;
$$;

revoke execute on function public.record_loyalty_purchase from public, anon;
grant execute on function public.record_loyalty_purchase to authenticated;

create function public.adjust_loyalty_stamps(
  p_customer_id uuid,
  p_stamps integer,
  p_note text,
  p_created_by_name text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  select organization_id into v_organization_id
    from public.loyalty_customers
   where id = p_customer_id;

  if v_organization_id is null
     or not public.has_role(v_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_stamps = 0 then
    raise exception 'stamps must not be zero' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('loyalty:' || p_customer_id::text));

  if public.get_loyalty_balance(p_customer_id) + p_stamps < 0 then
    raise exception 'balance would be negative' using errcode = 'TB022';
  end if;

  insert into public.loyalty_transactions (
    organization_id, customer_id, kind, stamps, note, created_by_name
  )
  values (
    v_organization_id,
    p_customer_id,
    'adjust',
    p_stamps,
    nullif(trim(coalesce(p_note, '')), ''),
    p_created_by_name
  );

  return public.get_loyalty_balance(p_customer_id);
end;
$$;

revoke execute on function public.adjust_loyalty_stamps from public, anon;
grant execute on function public.adjust_loyalty_stamps to authenticated;
