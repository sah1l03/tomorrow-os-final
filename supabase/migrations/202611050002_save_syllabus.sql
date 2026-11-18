begin;

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

commit;
