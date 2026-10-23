create table public.financial_entry_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entry_id uuid not null references public.financial_entries (id) on delete cascade,
  path text not null unique,
  file_name text not null check (length(trim(file_name)) between 1 and 200),
  created_at timestamptz not null default now()
);

create index financial_entry_attachments_entry_id_idx
  on public.financial_entry_attachments (entry_id);

create index financial_entry_attachments_organization_id_idx
  on public.financial_entry_attachments (organization_id);

alter table public.financial_entry_attachments enable row level security;

create policy "financial_entry_attachments: managers all" on public.financial_entry_attachments
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "financial_entry_attachments: module access" on public.financial_entry_attachments
  as restrictive
  for all
  to authenticated
  using (public.has_any_module_access(organization_id, '{finance}'::public.app_module[]))
  with check (public.has_any_module_access(organization_id, '{finance}'::public.app_module[]));

insert into public.financial_entry_attachments (organization_id, entry_id, path, file_name, created_at)
select organization_id, id, document_path, 'Boleto ou nota', updated_at
  from public.financial_entries
 where document_path is not null
union all
select organization_id, id, receipt_path, 'Comprovante', updated_at
  from public.financial_entries
 where receipt_path is not null;

alter table public.financial_entries
  drop column document_path,
  drop column receipt_path;
