-- Tests use an unknown job, so no HTTP requests are queued. Fixtures roll back.
begin;

create function pg_temp.assert_job_access(allowed boolean) returns void
language plpgsql as $$
begin
  begin
    perform public.run_job('__authorization_test__');
    raise exception 'The unknown job unexpectedly ran';
  exception
    when insufficient_privilege then
      assert not allowed, 'A permitted caller was denied';
    when raise_exception then
      assert sqlerrm = 'run_job: unknown job "__authorization_test__"', sqlerrm;
      assert allowed, 'An unauthorized caller reached job execution';
  end;
end;
$$;

do $$
declare
  actor uuid;
  label text;
begin
  foreach label in array array['owner', 'manager', 'staff', 'inactive', 'no_access'] loop
    actor := gen_random_uuid();
    insert into auth.users (id, aud, role, email)
      values (actor, 'authenticated', 'authenticated', actor || '@example.invalid');
    if label <> 'no_access' then
      insert into public.staff (user_id, role, display_name, is_active)
      values (actor, case when label = 'inactive' then 'manager'::public.staff_role
        else label::public.staff_role end, 'Authorization test', label <> 'inactive');
    end if;
    perform set_config('test.jobs_' || label, actor::text, true);
  end loop;
end;
$$;

set local role authenticated;
do $$
declare
  label text;
  actor text;
begin
  foreach label in array array['owner', 'manager', 'staff', 'inactive', 'no_access'] loop
    actor := current_setting('test.jobs_' || label);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', actor, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', actor, true);
    perform pg_temp.assert_job_access(label in ('owner', 'manager'));
  end loop;
end;
$$;
reset role;

set local role anon;
select pg_temp.assert_job_access(false);
reset role;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.assert_job_access(true);
reset role;

-- pg_cron connects directly as postgres without a request JWT.
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.assert_job_access(true);

rollback;
