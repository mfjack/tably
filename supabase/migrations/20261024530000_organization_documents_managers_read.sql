drop policy "organization_documents: members read" on public.organization_documents;

create policy "organization_documents: managers read" on public.organization_documents
  for select to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));
