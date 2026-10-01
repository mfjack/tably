alter table public.kitchen_ticket_items
  add column sort_order integer not null default 0;

create or replace function public.create_kitchen_ticket(
  p_organization_id uuid,
  p_order_id uuid,
  p_items jsonb,
  p_note text,
  p_is_addition boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket_id uuid;
begin
  insert into public.kitchen_tickets (organization_id, order_id, note, is_addition)
  values (p_organization_id, p_order_id, nullif(trim(p_note), ''), p_is_addition)
  returning id into v_ticket_id;

  insert into public.kitchen_ticket_items (
    organization_id, ticket_id, product_name, quantity, note, sort_order
  )
  select
    p_organization_id,
    v_ticket_id,
    p.name,
    (entry.item ->> 'quantity')::integer,
    nullif(trim(entry.item ->> 'note'), ''),
    row_number() over (
      order by c.created_at nulls last, c.position nulls last, entry.item_index
    )
    from jsonb_array_elements(p_items) with ordinality as entry(item, item_index)
    join public.products as p
      on p.id = (entry.item ->> 'product_id')::uuid
     and p.organization_id = p_organization_id
    left join public.categories as c
      on c.id = p.category_id;

  return v_ticket_id;
end;
$$;
