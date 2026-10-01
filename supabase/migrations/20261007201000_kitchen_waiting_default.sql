alter table public.kitchen_tickets
  alter column status set default 'waiting';

create or replace function public.set_kitchen_ticket_status(
  p_ticket_id uuid,
  p_status public.kitchen_ticket_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.kitchen_tickets;
begin
  select * into v_ticket from public.kitchen_tickets where id = p_ticket_id for update;

  if not found or not public.is_member(v_ticket.organization_id) then
    raise exception 'kitchen ticket not found' using errcode = 'P0002';
  end if;

  update public.kitchen_tickets
     set status = p_status,
         ready_at = case
           when p_status in ('waiting', 'preparing') then null
           else coalesce(ready_at, now())
         end,
         delivered_at = case when p_status = 'delivered' then now() end
   where id = p_ticket_id;

  perform public.complete_order_if_done(v_ticket.order_id);
end;
$$;
