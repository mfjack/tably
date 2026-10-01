create extension if not exists pg_cron;

create function public.close_stale_orders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  for v_order_id in
    with closed_tickets as (
      update public.kitchen_tickets
         set status = 'delivered',
             ready_at = coalesce(ready_at, now()),
             delivered_at = now()
       where status <> 'delivered'
         and created_at < now() - interval '1 hour'
      returning order_id
    )
    select distinct order_id from closed_tickets
  loop
    perform public.complete_order_if_done(v_order_id);
  end loop;

  update public.online_orders
     set status = 'rejected',
         decided_at = now()
   where status = 'pending'
     and created_at < now() - interval '30 minutes';
end;
$$;

revoke execute on function public.close_stale_orders from public, anon, authenticated;

select cron.schedule(
  'tably-close-stale-orders',
  '*/5 * * * *',
  'select public.close_stale_orders()'
);
