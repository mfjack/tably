create table public.product_addons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  price numeric(12, 2) not null check (price >= 0),
  ingredient_id uuid,
  ingredient_quantity numeric(14, 3) check (ingredient_quantity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  check (ingredient_id is null or ingredient_quantity is not null),
  foreign key (ingredient_id, organization_id)
    references public.ingredients (id, organization_id) on delete restrict
);

create unique index product_addons_organization_name_key
  on public.product_addons (organization_id, lower(name));

create index product_addons_ingredient_id_idx on public.product_addons (ingredient_id);

create trigger product_addons_updated_at
  before update on public.product_addons
  for each row execute function public.set_updated_at();

create table public.product_addon_links (
  product_id uuid not null,
  addon_id uuid not null,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  primary key (product_id, addon_id),
  foreign key (product_id, organization_id)
    references public.products (id, organization_id) on delete cascade,
  foreign key (addon_id, organization_id)
    references public.product_addons (id, organization_id) on delete cascade
);

create index product_addon_links_addon_id_idx on public.product_addon_links (addon_id);

do $$
declare
  v_table text;
begin
  foreach v_table in array array['product_addons', 'product_addon_links']
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

alter table public.order_items
  add column addons jsonb not null default '[]'::jsonb;

alter table public.kitchen_ticket_items
  add column addons jsonb not null default '[]'::jsonb;

create function public.normalize_addon_ids(p_addon_ids jsonb)
returns uuid[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct addon_id::uuid order by addon_id::uuid), '{}'::uuid[])
    from jsonb_array_elements_text(
      case when jsonb_typeof(p_addon_ids) = 'array' then p_addon_ids else '[]'::jsonb end
    ) as addon_id;
$$;

create function public.get_addons_total(p_addons jsonb)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum((addon ->> 'price')::numeric), 0)
    from jsonb_array_elements(coalesce(p_addons, '[]'::jsonb)) as addon;
$$;

create function public.resolve_item_addons(
  p_organization_id uuid,
  p_product_id uuid,
  p_addon_ids uuid[],
  p_allow_inactive boolean
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_addons jsonb;
  v_count integer;
begin
  if coalesce(cardinality(p_addon_ids), 0) = 0 then
    return '[]'::jsonb;
  end if;

  select
    count(*),
    jsonb_agg(
      jsonb_build_object('addon_id', a.id, 'name', a.name, 'price', a.price)
      order by a.name
    )
    into v_count, v_addons
    from public.product_addons as a
    join public.product_addon_links as l
      on l.addon_id = a.id
     and l.product_id = p_product_id
   where a.id = any (p_addon_ids)
     and a.organization_id = p_organization_id
     and (a.is_active or p_allow_inactive);

  if v_count <> cardinality(p_addon_ids) then
    raise exception 'unavailable addon in order' using errcode = 'TB032';
  end if;

  return v_addons;
end;
$$;

revoke execute on function public.resolve_item_addons from public, anon;

create function public.set_product_addons(p_product_id uuid, p_addon_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  select organization_id into v_organization_id
    from public.products
   where id = p_product_id;

  if v_organization_id is null then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  delete from public.product_addon_links
   where product_id = p_product_id
     and not (addon_id = any (coalesce(p_addon_ids, '{}'::uuid[])));

  insert into public.product_addon_links (product_id, addon_id, organization_id)
  select p_product_id, a.id, v_organization_id
    from public.product_addons as a
   where a.id = any (coalesce(p_addon_ids, '{}'::uuid[]))
     and a.organization_id = v_organization_id
  on conflict do nothing;
end;
$$;

revoke execute on function public.set_product_addons from public, anon;
grant execute on function public.set_product_addons to authenticated;

CREATE OR REPLACE FUNCTION public.place_order(p_organization_id uuid, p_items jsonb, p_note text DEFAULT NULL::text, p_payment_method payment_method DEFAULT NULL::payment_method, p_amount_received numeric DEFAULT NULL::numeric, p_customer_name text DEFAULT NULL::text, p_is_takeaway boolean DEFAULT false, p_send_to_kitchen boolean DEFAULT true, p_customer_account_id uuid DEFAULT NULL::uuid, p_request_id uuid DEFAULT NULL::uuid, p_placed_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_payments jsonb DEFAULT NULL::jsonb, p_discount_type text DEFAULT NULL::text, p_discount_value numeric DEFAULT NULL::numeric, p_has_service_fee boolean DEFAULT false, p_loyalty_phone text DEFAULT NULL::text, p_loyalty_reward_product_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(order_id uuid, order_number integer, order_total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order_id uuid;
  v_order_number integer;
  v_subtotal numeric(12, 2);
  v_takeaway_fee numeric(12, 2) := 0;
  v_total numeric(12, 2);
  v_item_count integer;
  v_valid_item_count integer;
  v_items jsonb;
  v_is_takeaway boolean := false;
  v_payments jsonb := public.normalize_order_payments(
    p_payments, p_payment_method, p_amount_received, p_customer_account_id
  );
  v_is_open boolean;
  v_is_offline boolean := p_placed_at is not null;
  v_placed_at timestamptz := least(coalesce(p_placed_at, now()), now());
  v_customer_name text := nullif(trim(p_customer_name), '');
  v_ticket_id uuid;
  v_is_paying boolean;
  v_sends_to_kitchen boolean;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  v_is_paying := v_payments is not null or p_loyalty_reward_product_id is not null;
  v_sends_to_kitchen := coalesce(p_send_to_kitchen, true) and public.is_kitchen_enabled(p_organization_id);
  v_is_open := v_sends_to_kitchen or not v_is_paying;

  if p_request_id is not null then
    perform pg_advisory_xact_lock(hashtext(p_request_id::text));

    if exists (
      select 1 from public.order_requests
       where id = p_request_id and organization_id <> p_organization_id
    ) then
      raise exception 'offline request belongs to another organization' using errcode = '42501';
    end if;

    return query
      select o.id, o.number, o.total
        from public.order_requests as r
        join public.orders as o on o.id = r.order_id
       where r.id = p_request_id;
    if found then
      return;
    end if;
  end if;

  drop table if exists requested_items;

  create temporary table requested_items on commit drop as
  select
    (item ->> 'product_id')::uuid as product_id,
    nullif(left(trim(item ->> 'note'), 140), '') as note,
    public.normalize_addon_ids(item -> 'addon_ids') as addon_ids,
    sum((item ->> 'quantity')::integer) as quantity
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  group by 1, 2, 3;

  alter table requested_items
    add column addons jsonb,
    add column addons_price numeric(12, 2);

  select count(*) into v_item_count from requested_items;

  if v_item_count = 0 then
    raise exception 'order has no items' using errcode = '22023';
  end if;

  if exists (select 1 from requested_items where quantity is null or quantity <= 0) then
    raise exception 'invalid item quantity' using errcode = '22023';
  end if;

  update requested_items
     set addons = public.resolve_item_addons(p_organization_id, product_id, addon_ids, v_is_offline);

  update requested_items
     set addons_price = public.get_addons_total(addons);

  select count(*), coalesce(sum((p.price + requested.addons_price) * requested.quantity), 0)
    into v_valid_item_count, v_subtotal
    from requested_items as requested
    join public.products as p
      on p.id = requested.product_id
     and p.organization_id = p_organization_id
     and (p.is_active or v_is_offline);

  if v_valid_item_count <> v_item_count then
    raise exception 'unavailable product in order' using errcode = 'P0002';
  end if;

  select coalesce(p_is_takeaway, false) and o.is_takeaway_enabled
    into v_is_takeaway
    from public.organizations as o
   where o.id = p_organization_id;

  if v_is_takeaway then
    select takeaway_fee into v_takeaway_fee
      from public.organizations
     where id = p_organization_id;
  end if;

  v_total := v_subtotal + v_takeaway_fee;

  if v_is_open and v_customer_name is not null then
    if v_is_offline then
      v_customer_name := public.resolve_offline_customer_name(p_organization_id, v_customer_name);
    else
      perform pg_advisory_xact_lock(
        hashtext(p_organization_id::text || ':' || lower(v_customer_name))
      );

      if public.is_customer_name_in_use(p_organization_id, v_customer_name) then
        raise exception 'customer name already in use' using errcode = 'TB002';
      end if;
    end if;
  end if;

  update public.organizations
     set last_order_number = last_order_number + 1
   where id = p_organization_id
  returning last_order_number into v_order_number;

  insert into public.orders (
    organization_id, number, status, note, customer_name, is_takeaway,
    subtotal, takeaway_fee, total, created_at
  )
  values (
    p_organization_id,
    v_order_number,
    case when v_is_open then 'in_kitchen' else 'completed' end::public.order_status,
    nullif(trim(p_note), ''),
    v_customer_name,
    v_is_takeaway,
    v_subtotal,
    v_takeaway_fee,
    v_total,
    v_placed_at
  )
  returning id into v_order_id;

  if v_is_paying then
    if p_loyalty_reward_product_id is not null then
      perform public.apply_loyalty_reward(
        v_order_id,
        p_loyalty_phone,
        (select p.price
           from requested_items as requested
           join public.products as p on p.id = requested.product_id
          where requested.product_id = p_loyalty_reward_product_id
          limit 1),
        (select p.name
           from public.products as p
          where p.id = p_loyalty_reward_product_id
            and exists (select 1 from requested_items where product_id = p.id))
      );
    end if;

    v_total := public.apply_order_adjustments(
      v_order_id, p_discount_type, p_discount_value, coalesce(p_has_service_fee, false)
    );
    perform public.settle_order(p_organization_id, v_order_id, v_payments, v_total, v_placed_at);
  end if;

  insert into public.order_items (
    organization_id, order_id, product_id, product_name, quantity, unit_price, note, addons
  )
  select
    p_organization_id, v_order_id, p.id, p.name, requested.quantity,
    p.price + requested.addons_price, requested.note, requested.addons
    from requested_items as requested
    join public.products as p on p.id = requested.product_id;

  select jsonb_agg(jsonb_build_object(
    'product_id', product_id,
    'quantity', quantity,
    'note', note,
    'addon_ids', to_jsonb(addon_ids),
    'addons', addons
  ))
    into v_items
    from requested_items;

  if v_sends_to_kitchen then
    v_ticket_id := public.create_kitchen_ticket(p_organization_id, v_order_id, v_items, p_note, false);

    if v_is_offline then
      perform public.deliver_offline_kitchen_ticket(v_ticket_id, v_placed_at);
      perform public.complete_order_if_done(v_order_id);
    end if;
  end if;

  perform public.move_order_stock(p_organization_id, v_order_id, v_items, false, v_is_offline);

  if p_request_id is not null then
    insert into public.order_requests (id, organization_id, order_id)
    values (p_request_id, p_organization_id, v_order_id);
  end if;

  return query select v_order_id, v_order_number, v_total;
end;
$function$;

CREATE OR REPLACE FUNCTION public.add_order_items(p_order_id uuid, p_items jsonb, p_note text DEFAULT NULL::text, p_request_id uuid DEFAULT NULL::uuid, p_placed_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders;
  v_added numeric(12, 2);
  v_item_count integer;
  v_valid_item_count integer;
  v_items jsonb;
  v_total numeric(12, 2);
  v_is_offline boolean := p_placed_at is not null;
  v_ticket_id uuid;
begin
  if p_request_id is not null then
    perform pg_advisory_xact_lock(hashtext(p_request_id::text));

    select o.total into v_total
      from public.order_requests as r
      join public.orders as o on o.id = r.order_id
     where r.id = p_request_id
       and r.order_id = p_order_id
       and public.is_member(o.organization_id);
    if found then
      return v_total;
    end if;
  end if;

  v_order := public.lock_open_order(p_order_id);

  drop table if exists requested_items;

  create temporary table requested_items on commit drop as
  select
    (item ->> 'product_id')::uuid as product_id,
    nullif(left(trim(item ->> 'note'), 140), '') as note,
    public.normalize_addon_ids(item -> 'addon_ids') as addon_ids,
    sum((item ->> 'quantity')::integer) as quantity
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  group by 1, 2, 3;

  alter table requested_items
    add column addons jsonb,
    add column addons_price numeric(12, 2);

  select count(*) into v_item_count from requested_items;

  if v_item_count = 0 or exists (
    select 1 from requested_items where quantity is null or quantity <= 0
  ) then
    raise exception 'invalid items' using errcode = '22023';
  end if;

  update requested_items
     set addons = public.resolve_item_addons(v_order.organization_id, product_id, addon_ids, v_is_offline);

  update requested_items
     set addons_price = public.get_addons_total(addons);

  select count(*), coalesce(sum((p.price + requested.addons_price) * requested.quantity), 0)
    into v_valid_item_count, v_added
    from requested_items as requested
    join public.products as p
      on p.id = requested.product_id
     and p.organization_id = v_order.organization_id
     and (p.is_active or v_is_offline);

  if v_valid_item_count <> v_item_count then
    raise exception 'unavailable product in order' using errcode = 'P0002';
  end if;

  update public.order_items as oi
     set quantity = oi.quantity + requested.quantity
    from requested_items as requested
    join public.products as p on p.id = requested.product_id
   where oi.order_id = p_order_id
     and oi.product_id = requested.product_id
     and oi.unit_price = p.price + requested.addons_price
     and oi.addons = requested.addons
     and oi.note is not distinct from requested.note;

  insert into public.order_items (
    organization_id, order_id, product_id, product_name, quantity, unit_price, note, addons
  )
  select
    v_order.organization_id, p_order_id, p.id, p.name, requested.quantity,
    p.price + requested.addons_price, requested.note, requested.addons
    from requested_items as requested
    join public.products as p on p.id = requested.product_id
   where not exists (
     select 1
       from public.order_items as oi
      where oi.order_id = p_order_id
        and oi.product_id = requested.product_id
        and oi.unit_price = p.price + requested.addons_price
        and oi.addons = requested.addons
        and oi.note is not distinct from requested.note
   );

  select jsonb_agg(jsonb_build_object(
    'product_id', product_id,
    'quantity', quantity,
    'note', note,
    'addon_ids', to_jsonb(addon_ids),
    'addons', addons
  ))
    into v_items
    from requested_items;

  if public.is_kitchen_enabled(v_order.organization_id) then
    v_ticket_id := public.create_kitchen_ticket(v_order.organization_id, p_order_id, v_items, p_note, true);

    if v_is_offline then
      perform public.deliver_offline_kitchen_ticket(
        v_ticket_id,
        least(coalesce(p_placed_at, now()), now())
      );
    end if;
  end if;

  perform public.move_order_stock(v_order.organization_id, p_order_id, v_items, false, v_is_offline);

  update public.orders
     set subtotal = subtotal + v_added,
         total = total + v_added
   where id = p_order_id
  returning total into v_total;

  if p_request_id is not null then
    insert into public.order_requests (id, organization_id, order_id)
    values (p_request_id, v_order.organization_id, p_order_id);
  end if;

  return v_total;
end;
$function$;

CREATE OR REPLACE FUNCTION public.move_order_stock(p_organization_id uuid, p_order_id uuid, p_items jsonb, p_is_return boolean, p_allow_negative boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  drop table if exists stock_changes;

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

  if not p_is_return then
    perform 1
       from public.ingredients as i
       join stock_changes as change on change.ingredient_id = i.id
      where i.organization_id = p_organization_id
        for update of i;

    if not coalesce(p_allow_negative, false) and exists (
      select 1
        from stock_changes as change
        join public.ingredients as i on i.id = change.ingredient_id
       where i.current_stock < change.quantity
    ) then
      raise exception 'insufficient stock' using errcode = 'TB001';
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

  drop table stock_changes;
end;
$function$;

CREATE OR REPLACE FUNCTION public.remove_order_item(p_order_item_id uuid, p_quantity integer DEFAULT 1)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_item public.order_items;
  v_order public.orders;
  v_removed_quantity integer;
  v_total numeric(12, 2);
begin
  select * into v_item from public.order_items where id = p_order_item_id;

  if not found then
    raise exception 'order item not found' using errcode = 'P0002';
  end if;

  v_order := public.lock_open_order(v_item.order_id);

  if coalesce(p_quantity, 0) <= 0 then
    raise exception 'invalid quantity' using errcode = '22023';
  end if;

  v_removed_quantity := least(p_quantity, v_item.quantity);

  if v_removed_quantity = v_item.quantity then
    delete from public.order_items where id = p_order_item_id;
  else
    update public.order_items
       set quantity = quantity - v_removed_quantity
     where id = p_order_item_id;
  end if;

  if v_item.product_id is not null then
    perform public.move_order_stock(
      v_order.organization_id,
      v_order.id,
      jsonb_build_array(
        jsonb_build_object(
          'product_id', v_item.product_id,
          'quantity', v_removed_quantity,
          'addon_ids', (
            select coalesce(jsonb_agg(addon -> 'addon_id'), '[]'::jsonb)
              from jsonb_array_elements(v_item.addons) as addon
          )
        )
      ),
      true
    );
  end if;

  update public.orders
     set subtotal = subtotal - v_item.unit_price * v_removed_quantity,
         total = total - v_item.unit_price * v_removed_quantity
   where id = v_order.id
  returning total into v_total;

  return v_total;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_kitchen_ticket(p_organization_id uuid, p_order_id uuid, p_items jsonb, p_note text, p_is_addition boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ticket_id uuid;
begin
  insert into public.kitchen_tickets (organization_id, order_id, note, is_addition)
  values (p_organization_id, p_order_id, nullif(trim(p_note), ''), p_is_addition)
  returning id into v_ticket_id;

  insert into public.kitchen_ticket_items (
    organization_id, ticket_id, product_name, quantity, note, sort_order, unit_price, addons
  )
  select
    p_organization_id,
    v_ticket_id,
    p.name,
    (entry.item ->> 'quantity')::integer,
    nullif(trim(entry.item ->> 'note'), ''),
    row_number() over (
      order by c.created_at nulls last, c.position nulls last, entry.item_index
    ),
    p.price + public.get_addons_total(entry.item -> 'addons'),
    coalesce(entry.item -> 'addons', '[]'::jsonb)
    from jsonb_array_elements(p_items) with ordinality as entry(item, item_index)
    join public.products as p
      on p.id = (entry.item ->> 'product_id')::uuid
     and p.organization_id = p_organization_id
    left join public.categories as c
      on c.id = p.category_id;

  return v_ticket_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_order_item_unit_cost()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.product_id is not null then
    select pc.unit_cost into new.unit_cost
      from public.product_costs as pc
     where pc.product_id = new.product_id;
    new.unit_cost := coalesce(new.unit_cost, 0) + coalesce((
      select sum(a.ingredient_quantity * i.unit_cost)
        from jsonb_array_elements(coalesce(new.addons, '[]'::jsonb)) as addon
        join public.product_addons as a on a.id = (addon ->> 'addon_id')::uuid
        join public.ingredients as i on i.id = a.ingredient_id
    ), 0);
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.pay_order(p_order_id uuid, p_payment_method payment_method DEFAULT NULL::payment_method, p_amount_received numeric DEFAULT NULL::numeric, p_customer_account_id uuid DEFAULT NULL::uuid, p_payments jsonb DEFAULT NULL::jsonb, p_discount_type text DEFAULT NULL::text, p_discount_value numeric DEFAULT NULL::numeric, p_has_service_fee boolean DEFAULT false, p_loyalty_phone text DEFAULT NULL::text, p_loyalty_reward_product_id uuid DEFAULT NULL::uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders;
  v_total numeric(12, 2);
  v_payments jsonb := public.normalize_order_payments(
    p_payments, p_payment_method, p_amount_received, p_customer_account_id
  );
begin
  v_order := public.lock_open_order(p_order_id);

  if not exists (select 1 from public.order_items where order_id = p_order_id) then
    raise exception 'order has no items' using errcode = '22023';
  end if;

  if v_payments is null and p_loyalty_reward_product_id is null then
    raise exception 'payment is required' using errcode = '22023';
  end if;

  if p_loyalty_reward_product_id is not null then
    perform public.apply_loyalty_reward(
      p_order_id,
      p_loyalty_phone,
      (select item.unit_price - public.get_addons_total(item.addons)
         from public.order_items as item
        where item.order_id = p_order_id
          and item.product_id = p_loyalty_reward_product_id
        order by item.unit_price desc
        limit 1),
      (select item.product_name
         from public.order_items as item
        where item.order_id = p_order_id
          and item.product_id = p_loyalty_reward_product_id
        order by item.unit_price desc
        limit 1)
    );
  end if;

  v_total := public.apply_order_adjustments(
    p_order_id, p_discount_type, p_discount_value, coalesce(p_has_service_fee, false)
  );
  perform public.settle_order(v_order.organization_id, p_order_id, v_payments, v_total, now());
  perform public.complete_order_if_done(p_order_id);

  return v_total;
end;
$function$;
