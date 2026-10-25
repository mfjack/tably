CREATE OR REPLACE FUNCTION public.create_stock_purchase_payable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ingredient_name text;
  v_category_id uuid;
  v_account_id uuid;
  v_timezone text;
begin
  if new.payment_due_date is null or new.total_cost <= 0 then
    return new;
  end if;

  select name into v_ingredient_name from public.ingredients where id = new.ingredient_id;
  select timezone into v_timezone from public.organizations where id = new.organization_id;

  select id into v_category_id
    from public.financial_categories
   where organization_id = new.organization_id
     and kind = 'expense'
     and name = 'Insumos e mercadorias'
   limit 1;

  select id into v_account_id
    from public.financial_accounts
   where organization_id = new.organization_id
     and not is_archived
   order by created_at
   limit 1;

  insert into public.financial_entries (
    organization_id, kind, description, amount, due_date, category_id,
    supplier_id, account_id, source, source_key, source_date, paid_at, paid_amount
  )
  values (
    new.organization_id,
    'expense',
    'Compra de ' || v_ingredient_name,
    new.total_cost,
    new.payment_due_date,
    v_category_id,
    new.supplier_id,
    v_account_id,
    'stock_purchase',
    'stock:' || new.id,
    (new.entered_at at time zone coalesce(v_timezone, 'America/Sao_Paulo'))::date,
    case when new.payment_due_date <= public.organization_today(new.organization_id)
      then new.payment_due_date end,
    case when new.payment_due_date <= public.organization_today(new.organization_id)
      then new.total_cost end
  );

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.receive_purchase_order(p_order_id uuid, p_items jsonb, p_payment_due_date date DEFAULT NULL::date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      supplier_id, account_id, source, source_key, source_date, paid_at, paid_amount
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
      public.organization_today(v_order.organization_id),
      case when p_payment_due_date <= public.organization_today(v_order.organization_id)
        then p_payment_due_date end,
      case when p_payment_due_date <= public.organization_today(v_order.organization_id)
        then v_total end
    );
  end if;

  update public.purchase_orders
     set status = 'received',
         received_at = now(),
         received_by_name = public.current_person_name(v_order.organization_id)
   where id = p_order_id;

  return v_total;
end;
$function$;
