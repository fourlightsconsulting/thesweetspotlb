/**
 * Why a problem event needs nothing from anyone: a robot, staff testing, or
 * another company's script failing on our page. Instagram's and Facebook's
 * in-app browser adds its own script: on Android its errors come from
 * iabjs://, on iPhone they carry the page's address, so those are known by
 * the names only that script uses.
 */
create or replace function public.health_handled(p_event text, p_params jsonb, p_bot boolean, p_internal boolean)
returns text
language sql immutable set search_path = '' as $$
  select case
    when p_bot then 'robot'
    when p_internal then 'staff'
    when p_event <> 'client_error' then null
    when coalesce(p_params ->> 'source', '') ~* '^iabjs://' then 'in_app_android'
    when coalesce(p_params ->> 'message', '') ~ '(webkit\.messageHandlers|_AutofillCallbackHandler)'
      then 'in_app_iphone'
    when coalesce(p_params ->> 'source', '') ~*
      '(facebook\.(net|com)|googletagmanager|google-analytics|doubleclick|gstatic|googleapis)'
      then 'other_script'
  end;
$$;
