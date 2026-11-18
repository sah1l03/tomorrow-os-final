-- TomorrowOS V1.5: run once in the SQL Editor of an EMPTY Supabase project.
-- For an existing database, apply only missing files in supabase/migrations/.
-- Generated from the migration files below; they are the source of truth.

begin;

-- 202610050001_create_events.sql
create table public.events (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    default auth.uid()
    references auth.users(id) on delete cascade,

  title text not null
    check (char_length(trim(title)) between 1 and 200),

  category text not null default 'personal'
    check (category in ('personal', 'class', 'work')),

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  location text not null default '',
  notes text not null default '',

  visibility text not null default 'private'
    check (visibility in ('private', 'busy', 'shared')),

  created_at timestamptz not null default now(),

  constraint events_end_after_start
    check (ends_at > starts_at)
);

create index events_owner_start_idx
  on public.events (owner_id, starts_at);

alter table public.events enable row level security;

revoke all on table public.events from anon, authenticated;

grant select, insert, update, delete
  on table public.events to authenticated;

create policy "Owners can read events"
  on public.events
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can create events"
  on public.events
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners can update events"
  on public.events
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners can delete events"
  on public.events
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- 202610230001_create_courses.sql
create table public.courses (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    default auth.uid()
    references auth.users(id) on delete cascade,

  code text not null
    check (char_length(trim(code)) between 1 and 30),

  name text not null
    check (char_length(trim(name)) between 1 and 200),

  created_at timestamptz not null default now(),

  unique (id, owner_id)
);

create table public.class_meetings (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    default auth.uid()
    references auth.users(id) on delete cascade,

  course_id uuid not null,

  weekdays integer[] not null
    check (
      cardinality(weekdays) between 1 and 7
      and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]
      and array_position(weekdays, null) is null
    ),

  start_time time not null,
  end_time time not null,

  start_date date not null,
  end_date date not null,

  timezone text not null default 'America/Halifax'
    check (char_length(trim(timezone)) > 0),

  location text not null default '',

  visibility text not null default 'private'
    check (visibility in ('private', 'busy', 'shared')),

  created_at timestamptz not null default now(),

  constraint class_meetings_course_owner_fk
    foreign key (course_id, owner_id)
    references public.courses(id, owner_id)
    on delete cascade,

  constraint class_meetings_valid_times
    check (end_time > start_time),

  constraint class_meetings_valid_dates
    check (end_date >= start_date)
);

create index courses_owner_idx
  on public.courses (owner_id);

create index class_meetings_owner_course_idx
  on public.class_meetings (owner_id, course_id);

alter table public.courses enable row level security;
alter table public.class_meetings enable row level security;

revoke all on table public.courses from anon, authenticated;
revoke all on table public.class_meetings from anon, authenticated;

grant select, insert, update, delete
  on table public.courses to authenticated;

grant select, insert, update, delete
  on table public.class_meetings to authenticated;

create policy "Owners manage their courses"
  on public.courses
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners manage their class meetings"
  on public.class_meetings
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- 202610230002_class_recurrence.sql
alter table public.class_meetings
  add column repeat_every_weeks integer not null default 1
    check (repeat_every_weeks in (1, 2)),

  add column excluded_dates date[] not null default '{}'
    check (array_position(excluded_dates, null) is null);

-- 202611040001_create_deadlines.sql
create table public.deadlines (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,

  course_id uuid not null,

  title text not null
    check (char_length(trim(title)) between 1 and 200),

  kind text not null
    check (
      kind in (
        'assignment',
        'lab',
        'quiz',
        'test',
        'exam',
        'other'
      )
    ),

  due_date date not null,
  due_time time,

  timezone text not null default 'America/Halifax'
    check (char_length(trim(timezone)) > 0),

  status text not null default 'not_started'
    check (
      status in (
        'not_started',
        'in_progress',
        'completed'
      )
    ),

  visibility text not null default 'private'
    check (visibility in ('private', 'busy', 'shared')),

  source_name text not null default '',
  source_page integer check (source_page >= 1),

  created_at timestamptz not null default now(),

  constraint deadlines_course_owner_fk
    foreign key (course_id, owner_id)
    references public.courses(id, owner_id)
    on delete cascade
);

create index deadlines_owner_due_idx
  on public.deadlines(owner_id, due_date);

alter table public.deadlines enable row level security;

revoke all on table public.deadlines
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.deadlines
  to authenticated;

create policy "Users manage their own deadlines"
  on public.deadlines
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- 202611050001_planner_records.sql
alter table public.class_meetings
  add column label text not null default 'Class'
    check (char_length(trim(label)) between 1 and 120),
  add column notes text not null default '',
  add column source_name text not null default '',
  add column source_page integer check (source_page >= 1),
  add constraint class_meetings_biweekly_anchor check (
    repeat_every_weeks = 1 or (
      cardinality(weekdays) = 1 and weekdays[1] = extract(dow from start_date)
    )
  ) not valid;

create table public.work_shifts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workplace text not null check (char_length(trim(workplace)) between 1 and 200),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  repeat_until date,
  repeat_every_weeks integer not null default 1 check (repeat_every_weeks in (1, 2)),
  location text not null default '',
  notes text not null default '',
  visibility text not null default 'private' check (visibility in ('private', 'busy', 'shared')),
  calendar_uid text check (char_length(calendar_uid) between 1 and 512),
  created_at timestamptz not null default now(),
  unique (owner_id, calendar_uid),
  check (ends_at > starts_at and ends_at <= starts_at + interval '25 hours'),
  check (repeat_until is null or repeat_until >= (starts_at at time zone 'America/Halifax')::date)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  due_date date,
  due_time time,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  completed boolean not null default false,
  visibility text not null default 'private' check (visibility in ('private', 'busy', 'shared')),
  created_at timestamptz not null default now(),
  check (due_date is not null or due_time is null)
);

create index work_shifts_owner_start_idx on public.work_shifts (owner_id, starts_at);
create index tasks_owner_due_idx on public.tasks (owner_id, due_date);

alter table public.work_shifts enable row level security;
alter table public.tasks enable row level security;

revoke all on table public.work_shifts, public.tasks from public, anon, authenticated;
grant select, insert, update, delete on table public.work_shifts, public.tasks to authenticated;

create policy "Owners manage their work shifts" on public.work_shifts
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners manage their tasks" on public.tasks
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- 202611050002_save_syllabus.sql
-- One call saves the reviewed rows together. If any insert fails, all roll back.
-- The caller's normal row security policies apply to every query.
create function public.save_syllabus_import(
  p_course_id uuid,
  p_course_code text,
  p_course_name text,
  p_source_name text,
  p_meetings jsonb,
  p_deadlines jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  user_id uuid := auth.uid();
  target_course uuid := p_course_id;
  meeting record;
  deadline record;
  meeting_days integer[];
  skip_dates date[];
  source_name text := left(trim(coalesce(p_source_name, '')), 240);
  meetings_added integer := 0;
  deadlines_added integer := 0;
  duplicates integer := 0;
begin
  if user_id is null then
    raise exception 'Sign in to save a syllabus.';
  end if;

  if jsonb_typeof(p_meetings) is distinct from 'array'
     or jsonb_typeof(p_deadlines) is distinct from 'array' then
    raise exception 'The selected syllabus items are invalid.';
  end if;

  if jsonb_array_length(p_meetings) > 50 or jsonb_array_length(p_deadlines) > 200 then
    raise exception 'Import at most 50 meetings and 200 deadlines at a time.';
  end if;

  if target_course is null then
    insert into public.courses (code, name)
    values (upper(trim(p_course_code)), trim(p_course_name))
    returning id into target_course;
  else
    -- Serialize imports into the same course so replays cannot add duplicates.
    perform 1 from public.courses as c
    where c.id = target_course and c.owner_id = user_id for update;
    if not found then
      raise exception 'Choose one of your own courses.';
    end if;
  end if;

  for meeting in
    select * from jsonb_to_recordset(p_meetings) as draft(
      label text, weekdays integer[], start_time time, end_time time,
      start_date date, end_date date, location text, repeat_every_weeks integer,
      excluded_dates date[], notes text, source_page integer
    )
  loop
    select coalesce(array_agg(distinct day order by day), '{}')
      into meeting_days from unnest(meeting.weekdays) as day;
    select coalesce(array_agg(distinct day order by day), '{}')
      into skip_dates from unnest(meeting.excluded_dates) as day;

    if exists (
      select 1 from unnest(skip_dates) as d
      where d is null or d < meeting.start_date or d > meeting.end_date
    ) then
      raise exception 'Skipped dates must be inside the meeting date range.';
    end if;

    if exists (
      select 1 from public.class_meetings as m
      where m.course_id = target_course and m.owner_id = user_id
        and lower(trim(m.label)) = lower(trim(meeting.label))
        and m.weekdays @> meeting_days and m.weekdays <@ meeting_days
        and m.start_time = meeting.start_time and m.end_time = meeting.end_time
        and m.start_date = meeting.start_date and m.end_date = meeting.end_date
        and m.repeat_every_weeks = meeting.repeat_every_weeks
        and m.excluded_dates @> skip_dates and m.excluded_dates <@ skip_dates
        and lower(trim(m.location)) = lower(trim(coalesce(meeting.location, '')))
        and m.timezone = 'America/Halifax'
    ) then
      duplicates := duplicates + 1;
    else
      insert into public.class_meetings (
        course_id, label, weekdays, start_time, end_time, start_date, end_date,
        location, repeat_every_weeks, excluded_dates, notes, source_name, source_page
      )
      values (
        target_course, trim(meeting.label), meeting_days, meeting.start_time,
        meeting.end_time, meeting.start_date, meeting.end_date,
        trim(coalesce(meeting.location, '')), meeting.repeat_every_weeks, skip_dates,
        trim(coalesce(meeting.notes, '')), source_name, meeting.source_page
      );
      meetings_added := meetings_added + 1;
    end if;
  end loop;

  for deadline in
    select * from jsonb_to_recordset(p_deadlines) as draft(
      title text, kind text, due_date date, due_time time, source_page integer
    )
  loop
    if exists (
      select 1 from public.deadlines as d
      where d.course_id = target_course and d.owner_id = user_id
        and lower(trim(d.title)) = lower(trim(deadline.title))
        and d.kind = deadline.kind and d.due_date = deadline.due_date
        and d.due_time is not distinct from deadline.due_time
        and d.timezone = 'America/Halifax'
    ) then
      duplicates := duplicates + 1;
    else
      insert into public.deadlines (
        course_id, title, kind, due_date, due_time, source_name, source_page
      )
      values (
        target_course, trim(deadline.title), deadline.kind, deadline.due_date,
        deadline.due_time, source_name, deadline.source_page
      );
      deadlines_added := deadlines_added + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'course_id', target_course, 'meetings_added', meetings_added,
    'deadlines_added', deadlines_added, 'duplicates', duplicates
  );
end;
$$;

revoke all on function public.save_syllabus_import(uuid, text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_syllabus_import(uuid, text, text, text, jsonb, jsonb)
  to authenticated;

-- 202611050003_shared_schedule.sql
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

-- 202611060001_friend_calendars.sql
-- Return only the requested date window. Roommates never read the source tables.
-- Busy rows are stripped of details here, before they leave the database.
drop function public.planner_schedule(date, date, text);

create function public.planner_schedule(
  p_from date, p_to date, p_scope text default 'mine', p_share_id uuid default null
)
returns table (
  id text, record_id uuid, kind text, title text, subtitle text, item_date date,
  starts_at timestamptz, ends_at timestamptz, location text, notes text,
  status text, visibility text, owner_label text,
  share_id uuid, shared_event_id uuid, shared_event_revision text
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
    select s.id, s.owner_id, s.owner_label, s.scope, s.categories, s.item_ids
    from public.calendar_shares as s
    where s.viewer_id = viewer and p_scope in ('all', 'shared')
      and (p_share_id is null or s.id = p_share_id)
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
    select i.*, s.owner_label, s.id as share_id, i.owner_id <> viewer as is_guest,
      i.owner_id <> viewer and i.kind = 'personal' and i.visibility = 'shared' as can_suggest,
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
    p.visibility, p.owner_label, p.share_id,
    case when p.can_suggest then p.record_id end,
    case when p.can_suggest then md5(jsonb_build_array(
      p.record_id, p.title, extract(epoch from p.starts_at), extract(epoch from p.ends_at)
    )::text) end
  from permitted as p
  order by coalesce(p.starts_at, p.item_date::timestamp at time zone 'America/Halifax'),
    case when p.redact then 'Busy' else p.title end, p.record_id;
end;
$$;

revoke all on function public.planner_schedule(date, date, text, uuid) from public, anon, authenticated;
grant execute on function public.planner_schedule(date, date, text, uuid) to authenticated;

-- Messages and suggestions live in the same private conversation.
create table public.calendar_activity (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  share_id uuid references public.calendar_shares(id) on delete cascade,
  event_id uuid,
  status text check (status in ('pending', 'approved', 'declined')),
  original_title text,
  original_start timestamptz,
  original_end timestamptz,
  proposed_title text,
  proposed_start timestamptz,
  proposed_end timestamptz,
  check (sender_id <> recipient_id),
  check (
    (status is null and share_id is null and body ~ '[^[:space:]]'
      and event_id is null and original_title is null and original_start is null and original_end is null
      and proposed_title is null and proposed_start is null and proposed_end is null)
    or
    (status is not null and share_id is not null and proposed_title is not null
      and char_length(btrim(proposed_title)) between 1 and 200
      and proposed_start is not null and proposed_end is not null
      and isfinite(proposed_start) and isfinite(proposed_end) and proposed_end > proposed_start
      and (
        (event_id is null and original_title is null and original_start is null and original_end is null)
        or (event_id is not null and original_title is not null and original_start is not null and original_end is not null)
      ))
  )
);

create index calendar_activity_thread_idx on public.calendar_activity (sender_id, recipient_id, created_at desc);
create index calendar_activity_inbox_idx on public.calendar_activity (recipient_id, status, created_at desc);
create index calendar_activity_share_idx on public.calendar_activity (share_id);

alter table public.calendar_activity enable row level security;
revoke all on table public.calendar_activity from public, anon, authenticated;
grant select on table public.calendar_activity to authenticated;
grant insert (recipient_id, body) on table public.calendar_activity to authenticated;

create policy "Connected friends can read their conversation" on public.calendar_activity
  for select to authenticated using (
    (select auth.uid()) in (sender_id, recipient_id)
    and exists (
      select 1 from public.calendar_shares as s
      where (s.owner_id = calendar_activity.sender_id and s.viewer_id = calendar_activity.recipient_id)
        or (s.owner_id = calendar_activity.recipient_id and s.viewer_id = calendar_activity.sender_id)
    )
  );

create policy "Connected friends can send a message" on public.calendar_activity
  for insert to authenticated with check (
    sender_id = (select auth.uid()) and status is null
    and exists (
      select 1 from public.calendar_shares as s
      where (s.owner_id = calendar_activity.sender_id and s.viewer_id = calendar_activity.recipient_id)
        or (s.owner_id = calendar_activity.recipient_id and s.viewer_id = calendar_activity.sender_id)
    )
  );

create function public.read_calendar_thread(p_friend_id uuid)
returns setof public.calendar_activity
language sql
stable
security invoker
set search_path = ''
as $$
  select a.*
  from public.calendar_activity as a
  where (a.sender_id = (select auth.uid()) and a.recipient_id = p_friend_id)
     or (a.recipient_id = (select auth.uid()) and a.sender_id = p_friend_id)
  order by (a.status is not distinct from 'pending' and a.recipient_id = (select auth.uid())) desc,
    a.created_at desc, a.id desc
  limit 60;
$$;

create function public.propose_calendar_event(
  p_share_id uuid, p_title text, p_start timestamptz, p_end timestamptz,
  p_body text default '', p_event_id uuid default null, p_expected text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  share public.calendar_shares%rowtype;
  original public.events%rowtype;
  suggestion_id uuid;
  title text := btrim(p_title);
  message text := coalesce(btrim(p_body), '');
begin
  if actor is null then raise exception 'Sign in to send a suggestion.'; end if;
  if title is null or char_length(title) not between 1 and 200 or char_length(message) > 1000
     or p_start is null or p_end is null or not isfinite(p_start) or not isfinite(p_end) or p_end <= p_start then
    raise exception 'Enter a title and choose a valid start and end time.';
  end if;

  select s.* into share from public.calendar_shares as s
    where s.id = p_share_id and s.viewer_id = actor for share;
  if not found then raise exception 'This calendar is no longer shared with you.'; end if;

  if p_event_id is not null then
    select e.* into original from public.events as e
      where e.id = p_event_id and e.owner_id = share.owner_id and e.category = 'personal'
        and e.visibility = 'shared'
        and (share.scope = 'all' or 'personal' = any(share.categories) or e.id = any(share.item_ids))
      for share;
    if not found or p_expected is distinct from md5(jsonb_build_array(
      original.id, original.title, extract(epoch from original.starts_at), extract(epoch from original.ends_at)
    )::text) then
      raise exception 'This event changed or is no longer shared. Refresh the calendar and try again.';
    end if;
    if original.title = title and original.starts_at = p_start and original.ends_at = p_end then
      raise exception 'Change the title or time before sending a suggestion.';
    end if;
  end if;

  insert into public.calendar_activity (sender_id, recipient_id, body, share_id, event_id, status,
    original_title, original_start, original_end, proposed_title, proposed_start, proposed_end)
  values (actor, share.owner_id, message, share.id, p_event_id, 'pending',
    original.title, original.starts_at, original.ends_at, title, p_start, p_end)
  returning id into suggestion_id;
  return suggestion_id;
end;
$$;

-- The calendar owner is the only person who can apply a pending suggestion.
-- Approval and the event change are committed together, and stale edits are rejected.
create function public.resolve_calendar_suggestion(p_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  share public.calendar_shares%rowtype;
  suggestion public.calendar_activity%rowtype;
  requested_share uuid;
begin
  if actor is null or p_approve is null then raise exception 'Choose whether to approve the suggestion.'; end if;

  select a.share_id into requested_share from public.calendar_activity as a
    where a.id = p_id and a.recipient_id = actor and a.status = 'pending';
  select s.* into share from public.calendar_shares as s
    where s.id = requested_share and s.owner_id = actor and s.viewer_id is not null for share;
  if not found then raise exception 'This suggestion is no longer available.'; end if;

  select a.* into suggestion from public.calendar_activity as a
    where a.id = p_id and a.recipient_id = actor and a.sender_id = share.viewer_id and a.status = 'pending'
    for update;
  if not found then raise exception 'This suggestion is no longer available.'; end if;

  if p_approve and suggestion.event_id is null then
    insert into public.events (owner_id, category, title, starts_at, ends_at, visibility)
    values (actor, 'personal', suggestion.proposed_title, suggestion.proposed_start, suggestion.proposed_end, 'private');
  elsif p_approve then
    update public.events as e
      set title = suggestion.proposed_title, starts_at = suggestion.proposed_start, ends_at = suggestion.proposed_end
      where e.id = suggestion.event_id and e.owner_id = actor and e.category = 'personal' and e.visibility = 'shared'
        and (share.scope = 'all' or 'personal' = any(share.categories) or e.id = any(share.item_ids))
        and e.title = suggestion.original_title and e.starts_at = suggestion.original_start and e.ends_at = suggestion.original_end;
    if not found then
      raise exception 'This event changed or is no longer shared. Decline this suggestion and ask for a new one.';
    end if;
  end if;

  update public.calendar_activity set status = case when p_approve then 'approved' else 'declined' end where id = p_id;
end;
$$;

revoke all on function public.read_calendar_thread(uuid),
  public.propose_calendar_event(uuid, text, timestamptz, timestamptz, text, uuid, text),
  public.resolve_calendar_suggestion(uuid, boolean) from public, anon, authenticated;
grant execute on function public.read_calendar_thread(uuid),
  public.propose_calendar_event(uuid, text, timestamptz, timestamptz, text, uuid, text),
  public.resolve_calendar_suggestion(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';

-- 202611060002_chat_and_share_back.sql
-- A calendar recipient can choose to share back with the owner of the accepted invite.
create function public.share_calendar_back(
  p_incoming_share_id uuid, p_scope text, p_categories text[], p_item_ids uuid[]
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  incoming public.calendar_shares%rowtype;
  outgoing_id uuid;
begin
  if actor is null then raise exception 'Sign in to share your calendar.'; end if;

  select s.* into incoming from public.calendar_shares as s
  where s.id = p_incoming_share_id and s.viewer_id = actor
  for share;
  if not found then raise exception 'This calendar connection is no longer active.'; end if;

  insert into public.calendar_shares (owner_id, viewer_id, owner_label, viewer_label, scope, categories, item_ids)
  values (actor, incoming.owner_id, coalesce(nullif(auth.jwt()->>'email', ''), 'Roommate'),
    incoming.owner_label, p_scope, p_categories, p_item_ids)
  on conflict (owner_id, viewer_id) do nothing
  returning id into outgoing_id;
  if outgoing_id is null then raise exception 'You already share a calendar with this friend.'; end if;
  return outgoing_id;
end;
$$;

-- Fetch the latest 40 plus a sentinel row, or the previous page.
-- Ordinary chat stays chronological; the UI has a separate queue for pending reviews.
create function public.calendar_thread_page(
  p_friend_id uuid, p_before timestamptz default null, p_before_id uuid default null
) returns setof public.calendar_activity
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not exists (
    select 1 from public.calendar_shares as s
    where (s.owner_id = actor and s.viewer_id = p_friend_id)
      or (s.owner_id = p_friend_id and s.viewer_id = actor)
  ) then
    raise exception 'This calendar connection is no longer active.';
  end if;
  if (p_before is null) <> (p_before_id is null) then
    raise exception 'Choose a valid message position.';
  end if;

  return query
  select page.* from (
    select a.* from public.calendar_activity as a
    where ((a.sender_id = actor and a.recipient_id = p_friend_id)
       or (a.recipient_id = actor and a.sender_id = p_friend_id))
      and (p_before is null or (a.created_at, a.id) < (p_before, p_before_id))
    order by a.created_at desc, a.id desc
    limit 41
  ) as page
  order by page.created_at, page.id;
end;
$$;

revoke all on function public.share_calendar_back(uuid, text, text[], uuid[]),
  public.calendar_thread_page(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.share_calendar_back(uuid, text, text[], uuid[]),
  public.calendar_thread_page(uuid, timestamptz, uuid) to authenticated;

notify pgrst, 'reload schema';

-- 202611060003_profiles.sql
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text check (username is null or username ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{2,23}$'),
  avatar_id uuid
);

create unique index profiles_username_unique on public.profiles (lower(username));

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

create policy "Read your own profile" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Create your own profile" on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Edit your own profile" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('tomorrow-profile-photos', 'tomorrow-profile-photos', false, 524288, array['image/jpeg']);

-- Each photo lives at <account id>/<photo id>.jpg. Photos are replaced
-- with new IDs, so the old image stays intact until the profile save succeeds.
create policy "Read your own TomorrowOS photos" on storage.objects for select to authenticated
  using (
    bucket_id = 'tomorrow-profile-photos'
    and storage.foldername(name) = array[(select auth.uid()::text)]
  );
create policy "Upload your own TomorrowOS photos" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tomorrow-profile-photos'
    and storage.foldername(name) = array[(select auth.uid()::text)]
    and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]jpg$'
  );
create policy "Delete your own TomorrowOS photos" on storage.objects for delete to authenticated
  using (
    bucket_id = 'tomorrow-profile-photos'
    and storage.foldername(name) = array[(select auth.uid()::text)]
  );

-- 202611060004_personal_repeats.sql
alter table public.events
  add column repeat_until date,
  add column repeat_every_weeks integer not null default 1 check (repeat_every_weeks in (1, 2)),
  add constraint events_repeat_range check (
    repeat_until is null or (
      category = 'personal' and isfinite(repeat_until)
      and isfinite(starts_at) and isfinite(ends_at)
      and repeat_until >= (starts_at at time zone 'America/Halifax')::date
    )
  );

-- Add series details for owner edits. Busy entries still reveal only availability.
drop function public.planner_schedule(date, date, text, uuid);

create function public.planner_schedule(
  p_from date, p_to date, p_scope text default 'mine', p_share_id uuid default null
)
returns table (
  id text, record_id uuid, kind text, title text, subtitle text, item_date date,
  starts_at timestamptz, ends_at timestamptz, location text, notes text,
  status text, visibility text, owner_label text,
  share_id uuid, shared_event_id uuid, shared_event_revision text,
  repeat_until date, repeat_every_weeks integer,
  series_starts_at timestamptz, series_ends_at timestamptz
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
    select s.id, s.owner_id, s.owner_label, s.scope, s.categories, s.item_ids
    from public.calendar_shares as s
    where s.viewer_id = viewer and p_scope in ('all', 'shared')
      and (p_share_id is null or s.id = p_share_id)
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
  personal_series as (
    select e.*, e.starts_at at time zone 'America/Halifax' as local_start,
      e.ends_at at time zone 'America/Halifax' as local_end, 7 * e.repeat_every_weeks as step_days
    from public.events as e
    where e.owner_id in (select o.owner_id from owners as o)
      and e.category = 'personal' and e.repeat_until is not null and e.starts_at < range_end
  ),
  items (record_id, owner_id, kind, title, subtitle, item_date, starts_at, ends_at,
         location, notes, status, visibility) as (
    select e.id, e.owner_id, e.category, e.title, ''::text,
      (e.starts_at at time zone 'America/Halifax')::date, e.starts_at, e.ends_at,
      e.location, e.notes, null::text, e.visibility
    from public.events as e
    where e.owner_id in (select o.owner_id from owners as o)
      and e.repeat_until is null and e.starts_at < range_end and e.ends_at > range_start

    union all

    -- Generate only occurrences that can overlap the requested window, including
    -- those that start earlier and run overnight or across several days.
    select e.id, e.owner_id, e.category, e.title, '', occurrence.day,
      timing.starts_at,
      case when timing.ends_at > timing.starts_at then timing.ends_at
        else timing.starts_at + (e.ends_at - e.starts_at) end,
      e.location, e.notes, null, e.visibility
    from personal_series as e
    cross join lateral generate_series(
      greatest(0, (p_from - e.local_end::date + e.step_days - 1) / e.step_days),
      (least(e.repeat_until, p_to - 1) - e.local_start::date) / e.step_days
    ) as instance(n)
    cross join lateral (
      select e.local_start::date + instance.n * e.step_days as day
    ) as occurrence
    cross join lateral (
      select
        case when instance.n = 0 then e.starts_at
          else (occurrence.day + e.local_start::time) at time zone 'America/Halifax' end as starts_at,
        case when instance.n = 0 then e.ends_at
          else ((occurrence.day + (e.local_end::date - e.local_start::date)) + e.local_end::time)
            at time zone 'America/Halifax' end as ends_at
    ) as timing

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
    select i.*, s.owner_label, s.id as share_id, i.owner_id <> viewer as is_guest,
      i.owner_id <> viewer and i.kind = 'personal' and i.visibility = 'shared' and e.repeat_until is null as can_suggest,
      e.repeat_until, e.repeat_every_weeks, e.starts_at as series_starts_at, e.ends_at as series_ends_at,
      i.owner_id <> viewer and i.visibility = 'busy' as redact
    from items as i
    left join shares as s on s.owner_id = i.owner_id
    left join public.events as e on i.kind = 'personal' and e.id = i.record_id and e.owner_id = i.owner_id
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
    p.visibility, p.owner_label, p.share_id,
    case when p.can_suggest then p.record_id end,
    case when p.can_suggest then md5(jsonb_build_array(
      p.record_id, p.title, extract(epoch from p.starts_at), extract(epoch from p.ends_at)
    )::text) end,
    case when not p.redact then p.repeat_until end,
    case when not p.redact and p.repeat_until is not null then p.repeat_every_weeks end,
    case when not p.is_guest and p.repeat_until is not null then p.series_starts_at end,
    case when not p.is_guest and p.repeat_until is not null then p.series_ends_at end
  from permitted as p
  order by coalesce(p.starts_at, p.item_date::timestamp at time zone 'America/Halifax'),
    case when p.redact then 'Busy' else p.title end, p.record_id;
end;
$$;

revoke all on function public.planner_schedule(date, date, text, uuid) from public, anon, authenticated;
grant execute on function public.planner_schedule(date, date, text, uuid) to authenticated;

-- A roommate suggestion for a single event must never change a series.
create or replace function public.propose_calendar_event(
  p_share_id uuid, p_title text, p_start timestamptz, p_end timestamptz,
  p_body text default '', p_event_id uuid default null, p_expected text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  share public.calendar_shares%rowtype;
  original public.events%rowtype;
  suggestion_id uuid;
  title text := btrim(p_title);
  message text := coalesce(btrim(p_body), '');
begin
  if actor is null then raise exception 'Sign in to send a suggestion.'; end if;
  if title is null or char_length(title) not between 1 and 200 or char_length(message) > 1000
     or p_start is null or p_end is null or not isfinite(p_start) or not isfinite(p_end) or p_end <= p_start then
    raise exception 'Enter a title and choose a valid start and end time.';
  end if;

  select s.* into share from public.calendar_shares as s
    where s.id = p_share_id and s.viewer_id = actor for share;
  if not found then raise exception 'This calendar is no longer shared with you.'; end if;

  if p_event_id is not null then
    select e.* into original from public.events as e
      where e.id = p_event_id and e.owner_id = share.owner_id and e.category = 'personal'
        and e.visibility = 'shared' and e.repeat_until is null
        and (share.scope = 'all' or 'personal' = any(share.categories) or e.id = any(share.item_ids))
      for share;
    if not found or p_expected is distinct from md5(jsonb_build_array(
      original.id, original.title, extract(epoch from original.starts_at), extract(epoch from original.ends_at)
    )::text) then
      raise exception 'This event changed or is no longer shared. Refresh the calendar and try again.';
    end if;
    if original.title = title and original.starts_at = p_start and original.ends_at = p_end then
      raise exception 'Change the title or time before sending a suggestion.';
    end if;
  end if;

  insert into public.calendar_activity (sender_id, recipient_id, body, share_id, event_id, status,
    original_title, original_start, original_end, proposed_title, proposed_start, proposed_end)
  values (actor, share.owner_id, message, share.id, p_event_id, 'pending',
    original.title, original.starts_at, original.ends_at, title, p_start, p_end)
  returning id into suggestion_id;
  return suggestion_id;
end;
$$;

-- The calendar owner is the only person who can apply a pending suggestion.
-- Approval and the event change are committed together, and stale edits are rejected.
create or replace function public.resolve_calendar_suggestion(p_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  share public.calendar_shares%rowtype;
  suggestion public.calendar_activity%rowtype;
  requested_share uuid;
begin
  if actor is null or p_approve is null then raise exception 'Choose whether to approve the suggestion.'; end if;

  select a.share_id into requested_share from public.calendar_activity as a
    where a.id = p_id and a.recipient_id = actor and a.status = 'pending';
  select s.* into share from public.calendar_shares as s
    where s.id = requested_share and s.owner_id = actor and s.viewer_id is not null for share;
  if not found then raise exception 'This suggestion is no longer available.'; end if;

  select a.* into suggestion from public.calendar_activity as a
    where a.id = p_id and a.recipient_id = actor and a.sender_id = share.viewer_id and a.status = 'pending'
    for update;
  if not found then raise exception 'This suggestion is no longer available.'; end if;

  if p_approve and suggestion.event_id is null then
    insert into public.events (owner_id, category, title, starts_at, ends_at, visibility)
    values (actor, 'personal', suggestion.proposed_title, suggestion.proposed_start, suggestion.proposed_end, 'private');
  elsif p_approve then
    update public.events as e
      set title = suggestion.proposed_title, starts_at = suggestion.proposed_start, ends_at = suggestion.proposed_end
      where e.id = suggestion.event_id and e.owner_id = actor and e.category = 'personal' and e.visibility = 'shared' and e.repeat_until is null
        and (share.scope = 'all' or 'personal' = any(share.categories) or e.id = any(share.item_ids))
        and e.title = suggestion.original_title and e.starts_at = suggestion.original_start and e.ends_at = suggestion.original_end;
    if not found then
      raise exception 'This event changed or is no longer shared. Decline this suggestion and ask for a new one.';
    end if;
  end if;

  update public.calendar_activity set status = case when p_approve then 'approved' else 'declined' end where id = p_id;
end;
$$;

notify pgrst, 'reload schema';

commit;
