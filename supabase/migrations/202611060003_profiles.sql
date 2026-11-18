begin;

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

commit;
