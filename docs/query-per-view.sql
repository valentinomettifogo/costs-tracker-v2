create or replace function public.space_members_map(_space_id uuid)
returns jsonb
language sql
security definer
set search_path = public, auth
as $$
  select coalesce(
    jsonb_object_agg(
      sc.user_id::text,
      coalesce(
        nullif(u.raw_user_meta_data->>'display_name', ''),
        nullif(u.raw_user_meta_data->>'full_name', ''),
        split_part(u.email, '@', 1),
        left(sc.user_id::text, 8)
      )
    ),
    '{}'::jsonb
  )
  from public.costs_spaces_connections sc
  left join auth.users u on u.id = sc.user_id
  where sc.space_id = _space_id
    and exists (
      select 1
      from public.costs_spaces_connections mine
      where mine.space_id = _space_id
        and mine.user_id = auth.uid()
    );
$$;

revoke all on function public.space_members_map(uuid) from public;
grant execute on function public.space_members_map(uuid) to authenticated;

create or replace view public.v_space_home_bootstrap
with (security_invoker = true) as
select
  s.id as space_id,
  s.name,
  s.currency,
  s.format,
  s.owner_id,
  s.color_needs,
  s.color_wants,
  s.color_savings,
  s.target_needs,
  s.target_wants,
  s.target_savings,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'type', c.type,
        'space_id', c.space_id
      )
      order by c.name
    )
    from costs_categories c
    where c.space_id = s.id
  ), '[]'::jsonb) as categories,
  (
    select min(m.date) from costs_movements m where m.space_id = s.id
  ) as oldest_movement_date,
  (
    select max(m.date) from costs_movements m where m.space_id = s.id
  ) as newest_movement_date,
  public.space_members_map(s.id) as members_map
from costs_spaces s
join costs_spaces_connections sc on sc.space_id = s.id
where sc.user_id = auth.uid();

grant select on public.v_space_home_bootstrap to authenticated;