create type public.document_kind as enum (
  'company_registration',
  'tax_registration',
  'operating_license',
  'health_license',
  'fire_certificate',
  'lease_agreement',
  'digital_certificate',
  'other'
);

create table public.organization_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  kind public.document_kind not null default 'other',
  file_path text not null,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  expires_on date,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organization_documents_organization_id_idx
  on public.organization_documents (organization_id, name);

create trigger organization_documents_updated_at
  before update on public.organization_documents
  for each row execute function public.set_updated_at();

alter table public.organization_documents enable row level security;

create policy "organization_documents: members read" on public.organization_documents
  for select to authenticated using (public.is_member(organization_id));

create policy "organization_documents: managers insert" on public.organization_documents
  for insert to authenticated
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "organization_documents: managers update" on public.organization_documents
  for update to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "organization_documents: managers delete" on public.organization_documents
  for delete to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-documents',
  'organization-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

create policy "organization documents: managers read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'organization-documents'
    and public.can_manage_storage_folder(name)
  );

create policy "organization documents: managers upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'organization-documents'
    and public.can_manage_storage_folder(name)
  );

create policy "organization documents: managers delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'organization-documents'
    and public.can_manage_storage_folder(name)
  );
