create or replace function public.get_opening_status(p_organization public.organizations)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with local_now as (
    select (now() at time zone p_organization.timezone) as moment
  ),
  hours as (
    select (hour ->> 'weekday')::integer as weekday,
           (hour ->> 'opensAt')::time as opens_at,
           (hour ->> 'closesAt')::time as closes_at
      from jsonb_array_elements(p_organization.opening_hours) as hour
  ),
  upcoming as (
    select offset_days,
           hours.weekday,
           hours.opens_at,
           hours.closes_at,
           (local_now.moment::date + offset_days) as day
      from local_now
     cross join generate_series(0, 7) as offset_days
      join hours
        on hours.weekday = extract(isodow from local_now.moment::date + offset_days)::integer
  ),
  today_open as (
    select upcoming.closes_at,
           (upcoming.day + upcoming.closes_at) at time zone p_organization.timezone as closes_at_moment
      from upcoming, local_now
     where upcoming.offset_days = 0
       and local_now.moment::time >= upcoming.opens_at
       and local_now.moment::time < upcoming.closes_at
  )
  select case
    when jsonb_array_length(p_organization.opening_hours) = 0 then
      jsonb_build_object('isConfigured', false, 'isOpen', true)
    else
      jsonb_build_object(
        'isConfigured', true,
        'isOpen', exists (select 1 from today_open),
        'closesAt', (select to_char(closes_at, 'HH24:MI') from today_open limit 1),
        'closesAtMoment', (select closes_at_moment from today_open limit 1),
        'nextOpening', (
          select jsonb_build_object(
                   'daysAhead', upcoming.offset_days,
                   'weekday', upcoming.weekday,
                   'opensAt', to_char(upcoming.opens_at, 'HH24:MI'),
                   'moment', (upcoming.day + upcoming.opens_at) at time zone p_organization.timezone
                 )
            from upcoming, local_now
           where upcoming.offset_days > 0
              or local_now.moment::time < upcoming.opens_at
           order by upcoming.offset_days, upcoming.opens_at
           limit 1
        )
      )
  end;
$$;
