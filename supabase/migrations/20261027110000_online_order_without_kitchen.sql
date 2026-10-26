create or replace function public.get_online_order_status(p_online_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'menuSlug', o.slug,
    'menuTitle', coalesce(nullif(trim(o.menu_title), ''), o.name),
    'customerName', coalesce(oo.accepted_customer_name, oo.customer_name),
    'note', oo.note,
    'total', oo.total,
    'createdAt', oo.created_at,
    'items', oo.items,
    'isKitchenEnabled', not ('kitchen' = any (o.hidden_modules)),
    'stage', case
      when oo.status = 'pending' then 'pending'
      when oo.status = 'rejected' then 'rejected'
      when ord.status = 'canceled' then 'rejected'
      when 'kitchen' = any (o.hidden_modules) then 'accepted'
      else coalesce((
        select case
          when bool_or(kt.status = 'preparing') then 'preparing'
          when bool_or(kt.status = 'waiting') then 'waiting'
          when bool_or(kt.status = 'ready') then 'ready'
          else 'delivered'
        end
          from public.kitchen_tickets as kt
         where kt.order_id = oo.order_id
      ), 'delivered')
    end
  )
    from public.online_orders as oo
    join public.organizations as o on o.id = oo.organization_id
    left join public.orders as ord on ord.id = oo.order_id
   where oo.id = p_online_order_id;
$$;
