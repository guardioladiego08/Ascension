begin;

drop function if exists public.get_lifetime_stats_user(uuid);
create function public.get_lifetime_stats_user(
  p_user_id uuid
)
returns table (
  user_id uuid,
  workouts_count integer,
  total_hours numeric,
  total_weight_lifted_kg numeric,
  total_kcal_consumed integer,
  total_elev_gain_m numeric,
  total_distance_ran_m numeric,
  total_distance_biked_m numeric,
  total_distance_walked_m numeric,
  total_distance_run_walk_m numeric,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, social, "user"
as $$
declare
  v_me uuid := auth.uid();
begin
  if p_user_id is null then
    return;
  end if;

  if v_me is not null and social.is_blocked(v_me, p_user_id) then
    return;
  end if;

  if social.profile_is_private(p_user_id)
     and (v_me is null or (v_me <> p_user_id and not social.is_following(v_me, p_user_id))) then
    return;
  end if;

  return query
  select
    ls.user_id,
    coalesce(ls.workouts_count, 0) as workouts_count,
    coalesce(ls.total_hours, 0) as total_hours,
    coalesce(ls.total_weight_lifted_kg, 0) as total_weight_lifted_kg,
    coalesce(ls.total_kcal_consumed, 0) as total_kcal_consumed,
    coalesce(ls.total_elev_gain_m, 0) as total_elev_gain_m,
    coalesce(ls.total_distance_ran_m, 0) as total_distance_ran_m,
    coalesce(ls.total_distance_biked_m, 0) as total_distance_biked_m,
    coalesce(ls.total_distance_walked_m, 0) as total_distance_walked_m,
    coalesce(ls.total_distance_run_walk_m, 0) as total_distance_run_walk_m,
    ls.updated_at
  from "user".lifetime_stats ls
  where ls.user_id = p_user_id
  limit 1;
end;
$$;

grant execute on function public.get_lifetime_stats_user(uuid) to authenticated;

commit;
