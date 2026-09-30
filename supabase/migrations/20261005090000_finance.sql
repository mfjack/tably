alter type public.app_module add value 'finance';

create type public.financial_account_kind as enum ('cash', 'bank', 'card_acquirer', 'digital_wallet');
create type public.financial_entry_kind as enum ('income', 'expense');
create type public.recurrence_frequency as enum (
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'yearly'
);

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  kind public.financial_account_kind not null,
  opening_balance numeric(12, 2) not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index financial_accounts_organization_name_idx
  on public.financial_accounts (organization_id, lower(trim(name)));

create table public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  kind public.financial_entry_kind not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index financial_categories_organization_name_idx
  on public.financial_categories (organization_id, kind, lower(trim(name)));

create table public.financial_recurrences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind public.financial_entry_kind not null,
  description text not null check (char_length(trim(description)) between 1 and 120),
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid,
  supplier_id uuid,
  account_id uuid,
  frequency public.recurrence_frequency not null,
  start_date date not null,
  end_date date,
  generated_until date,
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  check (end_date is null or end_date >= start_date),
  foreign key (category_id, organization_id)
    references public.financial_categories (id, organization_id) on delete set null (category_id),
  foreign key (supplier_id, organization_id)
    references public.suppliers (id, organization_id) on delete set null (supplier_id),
  foreign key (account_id, organization_id)
    references public.financial_accounts (id, organization_id) on delete set null (account_id)
);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind public.financial_entry_kind not null,
  description text not null check (char_length(trim(description)) between 1 and 120),
  amount numeric(12, 2) not null check (amount > 0),
  due_date date not null,
  category_id uuid,
  supplier_id uuid,
  account_id uuid,
  paid_at date,
  paid_amount numeric(12, 2) check (paid_amount >= 0),
  recurrence_id uuid,
  installment_group_id uuid,
  installment_number smallint,
  installment_count smallint,
  barcode text check (barcode ~ '^[0-9]{44,48}$'),
  document_path text,
  receipt_path text,
  notes text check (char_length(notes) <= 300),
  created_by_name text,
  paid_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (recurrence_id, due_date),
  check ((paid_at is null) = (paid_amount is null)),
  check (paid_at is null or account_id is not null),
  check ((installment_number is null) = (installment_count is null)),
  check (installment_number is null or installment_number between 1 and installment_count),
  foreign key (category_id, organization_id)
    references public.financial_categories (id, organization_id) on delete set null (category_id),
  foreign key (supplier_id, organization_id)
    references public.suppliers (id, organization_id) on delete set null (supplier_id),
  foreign key (account_id, organization_id)
    references public.financial_accounts (id, organization_id),
  foreign key (recurrence_id, organization_id)
    references public.financial_recurrences (id, organization_id) on delete set null (recurrence_id)
);

create index financial_entries_due_idx on public.financial_entries (organization_id, due_date);
create index financial_entries_paid_idx on public.financial_entries (organization_id, paid_at);
create index financial_entries_group_idx on public.financial_entries (installment_group_id);

create table public.financial_transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  from_account_id uuid not null,
  to_account_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  transferred_on date not null,
  notes text check (char_length(notes) <= 200),
  created_by_name text,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id),
  foreign key (from_account_id, organization_id)
    references public.financial_accounts (id, organization_id),
  foreign key (to_account_id, organization_id)
    references public.financial_accounts (id, organization_id)
);

create index financial_transfers_date_idx on public.financial_transfers (organization_id, transferred_on);

create trigger financial_accounts_updated_at
  before update on public.financial_accounts
  for each row execute function public.set_updated_at();

create trigger financial_recurrences_updated_at
  before update on public.financial_recurrences
  for each row execute function public.set_updated_at();

create trigger financial_entries_updated_at
  before update on public.financial_entries
  for each row execute function public.set_updated_at();

create function public.stamp_financial_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by_name := public.current_operator_name(new.organization_id);
  end if;

  if new.paid_at is not null and (tg_op = 'INSERT' or old.paid_at is null) then
    new.paid_by_name := public.current_operator_name(new.organization_id);
  elsif new.paid_at is null then
    new.paid_by_name := null;
  end if;

  return new;
end;
$$;

revoke execute on function public.stamp_financial_entry from public, anon, authenticated;

create trigger financial_entries_stamp
  before insert or update on public.financial_entries
  for each row execute function public.stamp_financial_entry();

create function public.stamp_financial_transfer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_by_name := public.current_operator_name(new.organization_id);
  return new;
end;
$$;

revoke execute on function public.stamp_financial_transfer from public, anon, authenticated;

create trigger financial_transfers_stamp
  before insert on public.financial_transfers
  for each row execute function public.stamp_financial_transfer();

alter table public.financial_accounts enable row level security;
alter table public.financial_categories enable row level security;
alter table public.financial_recurrences enable row level security;
alter table public.financial_entries enable row level security;
alter table public.financial_transfers enable row level security;

create policy "financial_accounts: managers all" on public.financial_accounts
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "financial_categories: managers all" on public.financial_categories
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "financial_recurrences: managers all" on public.financial_recurrences
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "financial_entries: managers all" on public.financial_entries
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create policy "financial_transfers: managers all" on public.financial_transfers
  for all to authenticated
  using (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]))
  with check (public.has_role(organization_id, array['owner', 'manager']::public.member_role[]));

create function public.recurrence_step(p_frequency public.recurrence_frequency, p_index integer)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case p_frequency
    when 'weekly' then make_interval(days => 7 * p_index)
    when 'biweekly' then make_interval(days => 14 * p_index)
    when 'monthly' then make_interval(months => p_index)
    when 'bimonthly' then make_interval(months => 2 * p_index)
    when 'quarterly' then make_interval(months => 3 * p_index)
    when 'semiannual' then make_interval(months => 6 * p_index)
    when 'yearly' then make_interval(years => p_index)
  end;
$$;

create function public.sync_financial_recurrences(p_organization_id uuid, p_until date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recurrence public.financial_recurrences;
  v_limit date;
  v_index integer;
  v_due_date date;
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  for v_recurrence in
    select *
      from public.financial_recurrences
     where organization_id = p_organization_id
       and (generated_until is null or generated_until < least(p_until, coalesce(end_date, p_until)))
     for update
  loop
    v_limit := least(p_until, coalesce(v_recurrence.end_date, p_until));
    v_index := 0;

    loop
      v_due_date := (v_recurrence.start_date + public.recurrence_step(v_recurrence.frequency, v_index))::date;
      exit when v_due_date > v_limit;

      if v_recurrence.generated_until is null or v_due_date > v_recurrence.generated_until then
        insert into public.financial_entries (
          organization_id, kind, description, amount, due_date,
          category_id, supplier_id, account_id, recurrence_id, notes
        )
        values (
          p_organization_id, v_recurrence.kind, v_recurrence.description, v_recurrence.amount, v_due_date,
          v_recurrence.category_id, v_recurrence.supplier_id, v_recurrence.account_id, v_recurrence.id,
          v_recurrence.notes
        )
        on conflict (recurrence_id, due_date) do nothing;
      end if;

      v_index := v_index + 1;
    end loop;

    update public.financial_recurrences
       set generated_until = v_limit
     where id = v_recurrence.id;
  end loop;
end;
$$;

revoke execute on function public.sync_financial_recurrences from public, anon;
grant execute on function public.sync_financial_recurrences to authenticated;

create function public.get_financial_overview(
  p_organization_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_today date := public.organization_today(p_organization_id);
begin
  if not public.has_role(p_organization_id, array['owner', 'manager']::public.member_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'today', v_today,
    'accounts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'kind', a.kind,
          'isArchived', a.is_archived,
          'balance', a.opening_balance
            + coalesce((
                select sum(case when e.kind = 'income' then e.paid_amount else -e.paid_amount end)
                  from public.financial_entries e
                 where e.account_id = a.id and e.paid_at is not null and e.paid_at <= v_today
              ), 0)
            + coalesce((
                select sum(t.amount) from public.financial_transfers t
                 where t.to_account_id = a.id and t.transferred_on <= v_today
              ), 0)
            - coalesce((
                select sum(t.amount) from public.financial_transfers t
                 where t.from_account_id = a.id and t.transferred_on <= v_today
              ), 0)
        )
        order by a.is_archived, a.name
      )
        from public.financial_accounts a
       where a.organization_id = p_organization_id
    ), '[]'::jsonb),
    'periodIncome', coalesce((
      select sum(paid_amount) from public.financial_entries
       where organization_id = p_organization_id and kind = 'income'
         and paid_at between p_from and p_to
    ), 0),
    'periodExpense', coalesce((
      select sum(paid_amount) from public.financial_entries
       where organization_id = p_organization_id and kind = 'expense'
         and paid_at between p_from and p_to
    ), 0),
    'overduePayables', (
      select jsonb_build_object('count', count(*), 'amount', coalesce(sum(amount), 0))
        from public.financial_entries
       where organization_id = p_organization_id and kind = 'expense'
         and paid_at is null and due_date < v_today
    ),
    'upcomingPayables', (
      select jsonb_build_object('count', count(*), 'amount', coalesce(sum(amount), 0))
        from public.financial_entries
       where organization_id = p_organization_id and kind = 'expense'
         and paid_at is null and due_date between v_today and v_today + 7
    ),
    'overdueReceivables', (
      select jsonb_build_object('count', count(*), 'amount', coalesce(sum(amount), 0))
        from public.financial_entries
       where organization_id = p_organization_id and kind = 'income'
         and paid_at is null and due_date < v_today
    ),
    'upcomingReceivables', (
      select jsonb_build_object('count', count(*), 'amount', coalesce(sum(amount), 0))
        from public.financial_entries
       where organization_id = p_organization_id and kind = 'income'
         and paid_at is null and due_date between v_today and v_today + 7
    )
  );
end;
$$;

revoke execute on function public.get_financial_overview from public, anon;
grant execute on function public.get_financial_overview to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'financial-documents',
  'financial-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

create policy "financial documents: managers read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'financial-documents'
    and public.can_manage_storage_folder(name)
  );

create policy "financial documents: managers upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'financial-documents'
    and public.can_manage_storage_folder(name)
  );

create policy "financial documents: managers delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'financial-documents'
    and public.can_manage_storage_folder(name)
  );
