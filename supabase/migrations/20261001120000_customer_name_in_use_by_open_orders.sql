update public.orders as o
   set status = 'completed'
 where o.paid_at is not null
   and o.status in ('in_kitchen', 'ready')
   and not exists (
     select 1
       from public.kitchen_tickets as t
      where t.order_id = o.id
        and t.status <> 'delivered'
   );

create or replace function public.is_customer_name_in_use(
  p_organization_id uuid,
  p_customer_name text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
      from public.orders as o
     where o.organization_id = p_organization_id
       and o.status <> 'canceled'
       and lower(o.customer_name) = lower(trim(p_customer_name))
       and (
         o.paid_at is null
         or exists (
           select 1
             from public.kitchen_tickets as t
            where t.order_id = o.id
              and t.status <> 'delivered'
         )
       )
  );
$$;
