begin;

-- An invite is a one-use random code. The owner chooses the scope and can revoke it.
create table public.calendar_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete cascade,
  owner_label text not null default coalesce(nullif(auth.jwt()->>'email', ''), 'Roommate'),
  viewer_label text,
  scope text not null check (scope in ('all', 'selected')),
  categories text[] not null default '{}',
  item_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (owner_id, viewer_id),
  check (viewer_id is distinct from owner_id),
  check (cardinality(categories) <= 5 and categories <@ array['class', 'work', 'deadline', 'personal', 'task']),
  check (array_position(item_ids, null) is null and cardinality(item_ids) <= 200),
  check (
    (scope = 'all' and cardinality(categories) = 0 and cardinality(item_ids) = 0)
    or (scope = 'selected' and cardinality(categories) + cardinality(item_ids) > 0)
  )
);

create index calendar_shares_viewer_idx on public.calendar_shares (viewer_id);
alter table public.calendar_shares enable row level security;

revoke all on table public.calendar_shares from public, anon, authenticated;
grant select, delete on table public.calendar_shares to authenticated;
grant insert (scope, categories, item_ids), update (scope, categories, item_ids)
  on table public.calendar_shares to authenticated;

create policy "Participants can read shares" on public.calendar_shares
  for select to authenticated using ((select auth.uid()) in (owner_id, viewer_id));

create policy "Owners create their own invites" on public.calendar_shares
  for insert to authenticated with check ((select auth.uid()) = owner_id and viewer_id is null);

create policy "Owners can adjust the scope" on public.calendar_shares
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Either participant can end a share" on public.calendar_shares
  for delete to authenticated using ((select auth.uid()) in (owner_id, viewer_id));

create function public.accept_calendar_share(p_code uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then
    raise exception 'Sign in to accept an invite.';
  end if;

  update public.calendar_shares as s
  set viewer_id = viewer, viewer_label = coalesce(nullif(auth.jwt()->>'email', ''), 'Roommate')
  where s.id = p_code and s.viewer_id is null and s.owner_id <> viewer;

  if not found then
    raise exception 'This invite code is invalid, already used, or belongs to you.';
  end if;
exception
  when unique_violation then
    raise exception 'This person already shares a calendar with you.';
end;
$$;

revoke all on function public.accept_calendar_share(uuid) from public, anon, authenticated;
grant execute on function public.accept_calendar_share(uuid) to authenticated;

-- Return only the requested date window. Roommates never read the source tables.
-- Busy rows are stripped of details here, before they leave the database.
create function public.planner_schedule(p_from date, p_to date, p_scope text default 'mine')
returns table (
  id text, record_id uuid, kind text, title text, subtitle text, item_date date,
  starts_at timestamptz, ends_at timestamptz, location text, notes text,
  status text, visibility text, owner_label text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  range_start timestamptz := p_from::timestamp at time zone 'America/Halifax';
  range_end timestamptz := p_to::timestamp at time zone 'America/Halifax';
begin
  if viewer is null then
    raise exception 'Sign in to view your schedule.';
  end if;
  if p_from is null or p_to is null or p_to - p_from not between 1 and 62
     or p_scope is null or p_scope not in ('mine', 'shared', 'all') then
    raise exception 'Choose a valid calendar range (up to 62 days).';
  end if;

  return query
  with shares as (
    select s.owner_id, s.owner_label, s.scope, s.categories, s.item_ids
    from public.calendar_shares as s
    where s.viewer_id = viewer and p_scope in ('all', 'shared')
  ),
  owners as (
    select viewer as owner_id where p_scope in ('mine', 'all')
    union all select s.owner_id from shares as s
  ),
  days as (
    select p_from + offset_days as day
    from generate_series(-2, p_to - p_from) as offset_days
  ),
  class_series as (
    select m.*, c.code, c.name,
      coalesce(z.name, 'America/Halifax') as zone
    from public.class_meetings as m
    join public.courses as c on c.id = m.course_id and c.owner_id = m.owner_id
    left join pg_timezone_names as z on z.name = m.timezone
    where m.owner_id in (select o.owner_id from owners as o)
      and m.start_date <= p_to and m.end_date >= p_from - 2
  ),
  work_series as (
    select w.*, w.starts_at at time zone 'America/Halifax' as local_start,
      w.ends_at at time zone 'America/Halifax' as local_end
    from public.work_shifts as w
    where w.owner_id in (select o.owner_id from owners as o)
      and w.starts_at < range_end
      and (w.ends_at > range_start or w.repeat_until >= p_from - 2)
  ),
  items (record_id, owner_id, kind, title, subtitle, item_date, starts_at, ends_at,
         location, notes, status, visibility) as (
    select e.id, e.owner_id, e.category, e.title, ''::text,
      (e.starts_at at time zone 'America/Halifax')::date, e.starts_at, e.ends_at,
      e.location, e.notes, null::text, e.visibility
    from public.events as e
    where e.owner_id in (select o.owner_id from owners as o)
      and e.starts_at < range_end and e.ends_at > range_start

    union all

    select m.id, m.owner_id, 'class', m.code || ' · ' || m.label, m.name,
      d.day, (d.day + m.start_time) at time zone m.zone, (d.day + m.end_time) at time zone m.zone,
      m.location, m.notes, null, m.visibility
    from class_series as m join days as d
      on d.day between m.start_date and m.end_date
      and extract(dow from d.day)::integer = any(m.weekdays)
      and ((d.day - m.start_date) / 7) % m.repeat_every_weeks = 0
      and not (d.day = any(m.excluded_dates))

    union all

    select w.id, w.owner_id, 'work', w.workplace, '', d.day,
      case when d.day = w.local_start::date then w.starts_at
        else (d.day + w.local_start::time) at time zone 'America/Halifax' end,
      case when d.day = w.local_start::date then w.ends_at
        else ((d.day + (w.local_end::date - w.local_start::date)) + w.local_end::time)
          at time zone 'America/Halifax' end,
      w.location, w.notes, null, w.visibility
    from work_series as w join days as d
      on d.day between w.local_start::date and coalesce(w.repeat_until, w.local_start::date)
      and (d.day - w.local_start::date) % (7 * w.repeat_every_weeks) = 0

    union all

    select d.id, d.owner_id, 'deadline', d.title, c.code || ' · ' || initcap(d.kind),
      d.due_date, (d.due_date + d.due_time) at time zone coalesce(z.name, 'America/Halifax'),
      null, '', '', d.status, d.visibility
    from public.deadlines as d
    join public.courses as c on c.id = d.course_id and c.owner_id = d.owner_id
    left join pg_timezone_names as z on z.name = d.timezone
    where d.owner_id in (select o.owner_id from owners as o)
      and d.due_date between p_from - 1 and p_to

    union all

    select t.id, t.owner_id, 'task', t.title, initcap(t.priority) || ' priority',
      t.due_date, (t.due_date + t.due_time) at time zone 'America/Halifax',
      null, '', '', case when t.completed then 'completed' else null end, t.visibility
    from public.tasks as t
    where t.owner_id in (select o.owner_id from owners as o)
      and t.due_date >= p_from and t.due_date < p_to
  ),
  permitted as (
    select i.*, s.owner_label, i.owner_id <> viewer as is_guest,
      i.owner_id <> viewer and i.visibility = 'busy' as redact
    from items as i
    left join shares as s on s.owner_id = i.owner_id
    where (i.owner_id = viewer or (
      s.owner_id is not null and i.visibility in ('busy', 'shared')
      and (s.scope = 'all' or i.kind = any(s.categories) or i.record_id = any(s.item_ids))
    )) and (
      (i.starts_at is null and i.item_date >= p_from and i.item_date < p_to)
      or (i.starts_at < range_end and coalesce(i.ends_at > range_start and i.ends_at > i.starts_at,
                                              i.starts_at >= range_start))
    )
  )
  select
    md5(viewer::text || ':' || p.kind || ':' || p.record_id::text || ':' || p.item_date::text),
    case when p.is_guest then null else p.record_id end,
    case when p.redact then 'busy' else p.kind end,
    case when p.redact then 'Busy' else p.title end,
    case when p.redact then '' else p.subtitle end,
    case when p.starts_at is null then p.item_date
      else (p.starts_at at time zone 'America/Halifax')::date end,
    p.starts_at, p.ends_at,
    case when p.redact then '' else p.location end,
    case when p.redact then '' else p.notes end,
    case when p.redact then null else p.status end,
    p.visibility, p.owner_label
  from permitted as p
  order by coalesce(p.starts_at, p.item_date::timestamp at time zone 'America/Halifax'),
    case when p.redact then 'Busy' else p.title end, p.record_id;
end;
$$;

revoke all on function public.planner_schedule(date, date, text) from public, anon, authenticated;
grant execute on function public.planner_schedule(date, date, text) to authenticated;

commit;
