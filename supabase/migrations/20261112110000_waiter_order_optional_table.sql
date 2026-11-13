create or replace function public.build_table_customer_name(
  p_table_number integer,
  p_customer_name text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    concat_ws(
      ' · ',
      case when p_table_number is not null then 'Mesa ' || p_table_number end,
      nullif(trim(p_customer_name), '')
    ),
    ''
  );
$$;

create or replace function public.place_waiter_order(
  p_organization_id uuid,
  p_table_number integer,
  p_customer_name text,
  p_items jsonb,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table_number integer := nullif(p_table_number, 0);
  v_customer_name text;
  v_order_id uuid;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  if v_table_number is not null and v_table_number not between 1 and 999 then
    raise exception 'invalid table number' using errcode = '22023';
  end if;

  v_customer_name := public.build_table_customer_name(v_table_number, p_customer_name);

  if v_customer_name is null then
    raise exception 'table or customer name is required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(p_organization_id::text || ':' || lower(v_customer_name))
  );

  select id into v_order_id
    from public.orders
   where organization_id = p_organization_id
     and paid_at is null
     and status <> 'canceled'
     and lower(customer_name) = lower(v_customer_name)
   order by created_at desc
   limit 1;

  if v_order_id is not null then
    perform public.add_order_items(v_order_id, p_items, p_note);
    return v_order_id;
  end if;

  select placed.order_id into v_order_id
    from public.place_order(
      p_organization_id => p_organization_id,
      p_items => p_items,
      p_note => p_note,
      p_customer_name => v_customer_name,
      p_send_to_kitchen => true
    ) as placed;

  update public.orders
     set table_number = v_table_number
   where id = v_order_id;

  return v_order_id;
end;
$$;
