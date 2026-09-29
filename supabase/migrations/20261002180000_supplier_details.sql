alter table public.suppliers
  add column contact_name text check (char_length(contact_name) <= 80),
  add constraint suppliers_document_check check (document ~ '^([0-9]{11}|[0-9]{14})$'),
  add constraint suppliers_phone_check check (phone ~ '^[0-9]{10,11}$'),
  add constraint suppliers_email_check check (char_length(email) <= 120 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add constraint suppliers_notes_check check (char_length(notes) <= 300);

create unique index suppliers_organization_name_idx
  on public.suppliers (organization_id, lower(trim(name)));

create view public.supplier_purchase_summaries
with (security_invoker = true)
as
select
  s.id as supplier_id,
  s.organization_id,
  coalesce(sum(e.total_cost), 0)::numeric(12, 2) as total_spent,
  count(e.id)::integer as entry_count,
  max(e.entered_at) as last_entry_at
from public.suppliers as s
left join public.stock_entries as e on e.supplier_id = s.id
group by s.id, s.organization_id;
