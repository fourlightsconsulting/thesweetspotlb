-- SECURITY DEFINER changes current_user to the function owner. Authorize
-- web callers from their JWT, retaining the trusted service and pg_cron paths.
create or replace function public.run_job(p_job text, p_body jsonb default '{}')
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_settings jsonb;
  v_url text;
  v_secret text;
  v_request bigint;
  v_run bigint;
begin
  if not (
    public.is_staff('manager')
    or coalesce((select auth.role()), '') = 'service_role'
    or ((select auth.role()) is null and session_user in ('postgres', 'supabase_admin'))
  ) then
    raise exception 'run_job: managers only' using errcode = '42501';
  end if;

  select value into v_settings from public.site_settings where key = 'jobs';
  v_url := case p_job
    when 'meta-ads' then (v_settings ->> 'functions_url') || '/import-meta-ads'
    when 'social' then (v_settings ->> 'functions_url') || '/import-social'
    when 'google' then (v_settings ->> 'functions_url') || '/import-google'
    when 'sweep' then (v_settings ->> 'site_url') || '/api/jobs/sweep'
  end;
  if v_url is null then
    raise exception 'run_job: unknown job "%"', p_job;
  end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'job_secret';

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-secret', v_secret),
    body := coalesce(p_body, '{}'),
    timeout_milliseconds := 120000
  ) into v_request;

  insert into public.job_runs (job, requested_by, request, pg_net_id)
  values (p_job, (select auth.uid()), coalesce(p_body, '{}'), v_request)
  returning id into v_run;
  return v_run;
end;
$$;

revoke execute on function public.run_job(text, jsonb) from public, anon;
grant execute on function public.run_job(text, jsonb) to authenticated, service_role;
