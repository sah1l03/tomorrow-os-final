begin;

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
commit;
