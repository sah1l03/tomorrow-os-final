begin;

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

commit;