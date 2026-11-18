begin;

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

commit;