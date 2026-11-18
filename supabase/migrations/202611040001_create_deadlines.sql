begin;

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

commit;