/**
 * Why a problem event needs nothing from anyone: a robot, staff testing, or
 * another company's script failing on our page: Meta's pixel, Google's tag,
 * or the script Instagram's and Facebook's in-app browser adds (iabjs://).
 */
create or replace function public.health_handled(p_event text, p_params jsonb, p_bot boolean, p_internal boolean)
returns text
language sql immutable set search_path = '' as $$
  select case
    when p_bot then 'robot'
    when p_internal then 'staff'
    when p_event = 'client_error' and coalesce(p_params ->> 'source', '') ~*
      '(^iabjs://|facebook\.(net|com)|googletagmanager|google-analytics|doubleclick|gstatic|googleapis)'
      then 'other_script'
  end;
$$;
