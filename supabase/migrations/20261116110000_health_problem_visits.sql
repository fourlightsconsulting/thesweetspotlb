-- Visits in one health_problems group, ordered and paged by the caller.
create function public.health_problem_visits(
  p_from timestamptz, p_to timestamptz, p_bucket text, p_event text, p_detail text, p_handled text
)
returns table (
  visit_id text, first_at timestamptz, last_at timestamptz, problems integer,
  attention boolean, device text, browser text, os text
)
language sql stable security invoker set search_path = '' as $$
  select e.visit_id, min(e.occurred_at), max(e.occurred_at), count(*)::int,
    p_bucket = 'attention', min(e.device_type), min(e.browser), min(e.os)
  from public.analytics_events e
  where e.occurred_at >= p_from and e.occurred_at < p_to
    and e.visit_id is not null
    and e.event_name = p_event
    and public.health_bucket(e.event_name, e.params, e.bot, e.internal) = p_bucket
    and coalesce(public.health_handled(e.event_name, e.params, e.bot, e.internal), '') = p_handled
    -- Match the detail used by health_problems, including its length limit.
    and left(case e.event_name
      when 'client_error' then coalesce(e.params ->> 'message', '')
      when 'not_found' then coalesce(e.params ->> 'requested', e.path, '')
      else coalesce(e.params ->> 'reason', '')
    end, 200) = p_detail
  group by e.visit_id;
$$;

revoke execute on function public.health_problem_visits(timestamptz, timestamptz, text, text, text, text)
  from public, anon;
grant execute on function public.health_problem_visits(timestamptz, timestamptz, text, text, text, text)
  to authenticated;
