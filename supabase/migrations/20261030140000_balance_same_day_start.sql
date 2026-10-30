create or replace function public.get_financial_account_balance(p_account_id uuid, p_today date)
returns numeric
language sql
stable
set search_path = ''
as $$
  with account as (
    select a.id, a.opening_balance,
           o.balance_started_at as started_at,
           (o.balance_started_at at time zone o.timezone)::date as started_on
      from public.financial_accounts as a
      join public.organizations as o on o.id = a.organization_id
     where a.id = p_account_id
  )
  select account.opening_balance
    + coalesce((
        select sum(case when e.kind = 'income' then e.paid_amount else -e.paid_amount end)
          from public.financial_entries as e
         where e.account_id = account.id
           and e.paid_at is not null
           and e.paid_at <= p_today
           and e.counts_in_balance
           and (
             account.started_on is null
             or e.paid_at > account.started_on
             or (e.paid_at = account.started_on and e.updated_at >= account.started_at)
           )
      ), 0)
    + coalesce((
        select sum(t.amount)
          from public.financial_transfers as t
         where t.to_account_id = account.id
           and t.transferred_on <= p_today
           and (
             account.started_on is null
             or t.transferred_on > account.started_on
             or (t.transferred_on = account.started_on and t.created_at >= account.started_at)
           )
      ), 0)
    - coalesce((
        select sum(t.amount)
          from public.financial_transfers as t
         where t.from_account_id = account.id
           and t.transferred_on <= p_today
           and (
             account.started_on is null
             or t.transferred_on > account.started_on
             or (t.transferred_on = account.started_on and t.created_at >= account.started_at)
           )
      ), 0)
    from account;
$$;
