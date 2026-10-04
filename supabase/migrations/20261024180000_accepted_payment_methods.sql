alter table public.organizations
  add column accepted_payment_methods public.payment_method[] not null
    default array['credit_card', 'debit_card', 'pix', 'cash']::public.payment_method[]
    check (
      cardinality(accepted_payment_methods) >= 1
      and not ('customer_account' = any (accepted_payment_methods))
    );

create function public.assert_payment_method_accepted(p_organization_id uuid, p_method public.payment_method)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_method <> 'customer_account' and not exists (
    select 1 from public.organizations
     where id = p_organization_id
       and p_method = any (accepted_payment_methods)
  ) then
    raise exception 'payment method not accepted' using errcode = 'TB025';
  end if;
end;
$$;

revoke execute on function public.assert_payment_method_accepted from public, anon, authenticated;

create or replace function public.set_order_payment_fee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_payment_method_accepted(new.organization_id, new.method);
  new.fee_percent := public.get_payment_fee_percent(new.organization_id, new.method);
  new.surcharge := public.get_payment_surcharge(new.organization_id, new.fee_percent, new.amount);
  return new;
end;
$$;

create or replace function public.set_account_payment_fee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'payment' and new.payment_method is not null then
    perform public.assert_payment_method_accepted(new.organization_id, new.payment_method);
    new.fee_percent := public.get_payment_fee_percent(new.organization_id, new.payment_method);
    new.surcharge := public.get_payment_surcharge(new.organization_id, new.fee_percent, new.amount);
  end if;
  return new;
end;
$$;
