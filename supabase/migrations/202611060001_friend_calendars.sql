begin;

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
commit;
