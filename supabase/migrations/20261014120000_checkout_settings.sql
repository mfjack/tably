alter table public.organizations
  add column is_service_fee_enabled boolean not null default false,
  add column is_discount_enabled boolean not null default true,
  add column is_split_bill_enabled boolean not null default true,
  add column is_customer_account_payment_enabled boolean not null default true,
  alter column service_fee_percent set default 10;

update public.organizations set service_fee_percent = 10 where service_fee_percent = 0;

create or replace function public.apply_order_adjustments(
  p_order_id uuid,
  p_discount_type text,
  p_discount_value numeric,
  p_has_service_fee boolean
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_organization public.organizations;
  v_fee_percent numeric(4, 1) := 0;
  v_service_fee numeric(12, 2) := 0;
  v_base numeric(12, 2);
  v_discount_value numeric(12, 2);
  v_discount numeric(12, 2) := 0;
  v_total numeric(12, 2);
begin
  select * into v_order from public.orders where id = p_order_id;
  select * into v_organization from public.organizations where id = v_order.organization_id;

  if p_discount_type is not null and not v_organization.is_discount_enabled then
    raise exception 'discounts are disabled' using errcode = 'TB015';
  end if;

  if p_has_service_fee and v_organization.is_service_fee_enabled and not v_order.is_takeaway then
    v_fee_percent := v_organization.service_fee_percent;
    v_service_fee := round(v_order.subtotal * v_fee_percent / 100, 2);
  end if;

  v_base := v_order.subtotal + v_order.takeaway_fee;

  if p_discount_type = 'percent' then
    v_discount_value := round(p_discount_value, 1);
    if v_discount_value is null or v_discount_value <= 0 or v_discount_value >= 100 then
      raise exception 'invalid discount' using errcode = 'TB014';
    end if;
    v_discount := round(v_base * v_discount_value / 100, 2);
  elsif p_discount_type = 'amount' then
    v_discount_value := round(p_discount_value, 2);
    if v_discount_value is null or v_discount_value <= 0 or v_discount_value >= v_base then
      raise exception 'invalid discount' using errcode = 'TB014';
    end if;
    v_discount := v_discount_value;
  elsif p_discount_type is not null then
    raise exception 'invalid discount' using errcode = 'TB014';
  end if;

  v_total := v_base + v_service_fee - v_discount;

  update public.orders
     set service_fee_percent = nullif(v_fee_percent, 0),
         service_fee_amount = v_service_fee,
         discount_type = case when v_discount > 0 then p_discount_type end,
         discount_value = case when v_discount > 0 then v_discount_value end,
         discount_amount = v_discount,
         discounted_by = case when v_discount > 0 then auth.uid() end,
         total = v_total
   where id = p_order_id;

  return v_total;
end;
$$;

create or replace function public.record_order_payments(
  p_organization_id uuid,
  p_order_id uuid,
  p_payments jsonb,
  p_total numeric,
  p_paid_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment jsonb;
  v_payment_count integer := jsonb_array_length(p_payments);
  v_method public.payment_method;
  v_amount numeric(12, 2);
  v_amount_received numeric(12, 2);
  v_paid_total numeric(12, 2) := 0;
  v_cash_received numeric(12, 2);
  v_primary_method public.payment_method;
  v_primary_amount numeric(12, 2) := 0;
begin
  if coalesce(v_payment_count, 0) = 0 then
    raise exception 'payment is required' using errcode = '22023';
  end if;

  for v_payment in select value from jsonb_array_elements(p_payments) loop
    v_method := (v_payment ->> 'method')::public.payment_method;
    v_amount := coalesce(
      (v_payment ->> 'amount')::numeric,
      case when v_payment_count = 1 then p_total end
    );

    if v_method is null or v_amount is null or v_amount <= 0 then
      raise exception 'invalid payment' using errcode = '22023';
    end if;

    v_amount_received := null;
    if v_method = 'cash' then
      v_amount_received := coalesce((v_payment ->> 'amount_received')::numeric, v_amount);
      if v_amount_received < v_amount then
        raise exception 'amount received is lower than total' using errcode = '22023';
      end if;
      v_cash_received := coalesce(v_cash_received, 0) + v_amount_received;
    end if;

    insert into public.order_payments (
      organization_id, order_id, method, amount, amount_received, customer_account_id, created_at
    )
    values (
      p_organization_id,
      p_order_id,
      v_method,
      v_amount,
      v_amount_received,
      case when v_method = 'customer_account' then nullif(v_payment ->> 'customer_account_id', '')::uuid end,
      p_paid_at
    );

    if v_method = 'customer_account' and not exists (
      select 1 from public.organizations
       where id = p_organization_id and is_customer_account_payment_enabled
    ) then
      raise exception 'customer account payments are disabled' using errcode = 'TB016';
    end if;

    if v_method = 'customer_account' then
      perform public.charge_customer_account(
        p_organization_id,
        nullif(v_payment ->> 'customer_account_id', '')::uuid,
        p_order_id,
        v_amount
      );
    end if;

    v_paid_total := v_paid_total + v_amount;
    if v_amount > v_primary_amount then
      v_primary_method := v_method;
      v_primary_amount := v_amount;
    end if;
  end loop;

  if v_paid_total <> p_total then
    raise exception 'payments do not match total' using errcode = 'TB006';
  end if;

  update public.orders
     set payment_method = v_primary_method,
         amount_received = v_cash_received,
         paid_at = p_paid_at,
         paid_by = auth.uid()
   where id = p_order_id;
end;
$$;
