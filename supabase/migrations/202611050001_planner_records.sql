begin;

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

commit;
