create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  opening_amount numeric(12, 2) not null default 0 check (opening_amount >= 0),
  opened_at timestamptz not null default now(),
  opened_by uuid references auth.users (id) on delete set null default auth.uid(),
  opened_by_name text,
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete set null,
  closed_by_name text,
  expected_cash numeric(12, 2),
  counted_cash numeric(12, 2) check (counted_cash >= 0),
  closing_note text check (char_length(closing_note) <= 500),
  unique (id, organization_id)
);

create unique index cash_sessions_one_open_idx
  on public.cash_sessions (organization_id)
  where closed_at is null;

create index cash_sessions_organization_opened_at_idx
  on public.cash_sessions (organization_id, opened_at desc);

create type public.cash_movement_kind as enum ('withdrawal', 'supply');

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  session_id uuid not null,
  kind public.cash_movement_kind not null,
  amount numeric(12, 2) not null check (amount > 0),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_by_name text,
  foreign key (session_id, organization_id)
    references public.cash_sessions (id, organization_id) on delete cascade
);

create index cash_movements_session_id_idx on public.cash_movements (session_id);

alter table public.order_payments
  add column cash_session_id uuid references public.cash_sessions (id) on delete set null;

create index order_payments_cash_session_id_idx
  on public.order_payments (cash_session_id);

alter table public.account_entries
  add column cash_session_id uuid references public.cash_sessions (id) on delete set null;

create index account_entries_cash_session_id_idx
  on public.account_entries (cash_session_id);

alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;

create policy "cash_sessions: members read" on public.cash_sessions
  for select to authenticated using (public.is_member(organization_id));

create policy "cash_movements: members read" on public.cash_movements
  for select to authenticated using (public.is_member(organization_id));

create function public.current_actor_name(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.current_operator_name(p_organization_id),
    (select full_name from public.profiles where id = auth.uid())
  );
$$;

revoke execute on function public.current_actor_name from public, anon, authenticated;

create function public.assign_cash_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'account_entries' and new.kind <> 'payment' then
    return new;
  end if;

  select id into new.cash_session_id
    from public.cash_sessions
   where organization_id = new.organization_id
     and closed_at is null;

  if new.cash_session_id is null and new.created_at >= now() - interval '5 minutes' then
    raise exception 'cash register is closed' using errcode = 'TB017';
  end if;

  return new;
end;
$$;

revoke execute on function public.assign_cash_session from public, anon, authenticated;

create trigger order_payments_assign_cash_session
  before insert on public.order_payments
  for each row execute function public.assign_cash_session();

create trigger account_entries_assign_cash_session
  before insert on public.account_entries
  for each row execute function public.assign_cash_session();

create function public.build_cash_session_summary(p_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with session as (
    select * from public.cash_sessions where id = p_session_id
  ),
  payments as (
    select method, amount, order_id
      from public.order_payments
     where cash_session_id = p_session_id
    union all
    select payment_method, amount, null
      from public.account_entries
     where cash_session_id = p_session_id
       and kind = 'payment'
  ),
  totals as (
    select
      coalesce(sum(amount) filter (where method = 'cash'), 0) as cash_received,
      coalesce(sum(amount), 0) as received_total,
      count(distinct order_id) as order_count
      from payments
  ),
  movement_totals as (
    select
      coalesce(sum(amount) filter (where kind = 'supply'), 0) as supplies,
      coalesce(sum(amount) filter (where kind = 'withdrawal'), 0) as withdrawals
      from public.cash_movements
     where session_id = p_session_id
  )
  select jsonb_build_object(
    'id', s.id,
    'openedAt', s.opened_at,
    'openedByName', s.opened_by_name,
    'openingAmount', s.opening_amount,
    'closedAt', s.closed_at,
    'closedByName', s.closed_by_name,
    'countedCash', s.counted_cash,
    'closingNote', s.closing_note,
    'orderCount', t.order_count,
    'receivedTotal', t.received_total,
    'supplies', m.supplies,
    'withdrawals', m.withdrawals,
    'expectedCash', coalesce(
      s.expected_cash,
      s.opening_amount + t.cash_received + m.supplies - m.withdrawals
    ),
    'payments', coalesce((
      select jsonb_agg(
        jsonb_build_object('method', method, 'amount', total)
        order by total desc
      )
        from (
          select method, sum(amount) as total
            from payments
           group by method
        ) as by_method
    ), '[]'::jsonb),
    'movements', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', cm.id,
          'kind', cm.kind,
          'amount', cm.amount,
          'note', cm.note,
          'createdAt', cm.created_at,
          'createdByName', cm.created_by_name
        )
        order by cm.created_at
      )
        from public.cash_movements as cm
       where cm.session_id = p_session_id
    ), '[]'::jsonb)
  )
    from session as s
    cross join totals as t
    cross join movement_totals as m;
$$;

revoke execute on function public.build_cash_session_summary from public, anon, authenticated;

create function public.get_open_cash_session(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  select id into v_session_id
    from public.cash_sessions
   where organization_id = p_organization_id
     and closed_at is null;

  if v_session_id is null then
    return null;
  end if;

  return public.build_cash_session_summary(v_session_id);
end;
$$;

revoke execute on function public.get_open_cash_session from public, anon;
grant execute on function public.get_open_cash_session to authenticated;

create function public.open_cash_session(
  p_organization_id uuid,
  p_opening_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.cash_sessions
     where organization_id = p_organization_id
       and closed_at is null
  ) then
    raise exception 'cash register is already open' using errcode = 'TB018';
  end if;

  insert into public.cash_sessions (organization_id, opening_amount, opened_by_name)
  values (
    p_organization_id,
    round(coalesce(p_opening_amount, 0), 2),
    public.current_actor_name(p_organization_id)
  )
  returning id into v_session_id;

  return v_session_id;
end;
$$;

revoke execute on function public.open_cash_session from public, anon;
grant execute on function public.open_cash_session to authenticated;

create function public.add_cash_movement(
  p_organization_id uuid,
  p_kind public.cash_movement_kind,
  p_amount numeric,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  select id into v_session_id
    from public.cash_sessions
   where organization_id = p_organization_id
     and closed_at is null
   for update;

  if v_session_id is null then
    raise exception 'cash register is closed' using errcode = 'TB017';
  end if;

  insert into public.cash_movements (
    organization_id, session_id, kind, amount, note, created_by_name
  )
  values (
    p_organization_id,
    v_session_id,
    p_kind,
    round(p_amount, 2),
    nullif(trim(p_note), ''),
    public.current_actor_name(p_organization_id)
  );
end;
$$;

revoke execute on function public.add_cash_movement from public, anon;
grant execute on function public.add_cash_movement to authenticated;

create function public.close_cash_session(
  p_organization_id uuid,
  p_counted_cash numeric,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_summary jsonb;
begin
  if not public.is_member(p_organization_id) then
    raise exception 'not a member of this organization' using errcode = '42501';
  end if;

  select id into v_session_id
    from public.cash_sessions
   where organization_id = p_organization_id
     and closed_at is null
   for update;

  if v_session_id is null then
    raise exception 'cash register is closed' using errcode = 'TB017';
  end if;

  v_summary := public.build_cash_session_summary(v_session_id);

  update public.cash_sessions
     set closed_at = now(),
         closed_by = auth.uid(),
         closed_by_name = public.current_actor_name(p_organization_id),
         expected_cash = (v_summary ->> 'expectedCash')::numeric,
         counted_cash = round(p_counted_cash, 2),
         closing_note = nullif(trim(p_note), '')
   where id = v_session_id;

  return public.build_cash_session_summary(v_session_id);
end;
$$;

revoke execute on function public.close_cash_session from public, anon;
grant execute on function public.close_cash_session to authenticated;

insert into public.cash_sessions (organization_id, opened_by, opened_by_name)
select id, null, 'Sistema'
  from public.organizations;
