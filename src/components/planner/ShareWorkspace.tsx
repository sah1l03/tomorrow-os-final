"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import FriendConversation from "@/components/planner/FriendConversation";
import PlannerDialog from "@/components/planner/PlannerDialog";
import { DeleteRecord, FormActions, useSaveRecord } from "@/components/planner/mutations";
import { CategoryBadge, EditorRail, EditorResults, EmptyState, Field, LoadError, Panel } from "@/components/planner/ui";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIES, SHARE_CATEGORIES, VISIBILITIES, dateLabel, entryTime, field,
  type CalendarShare, type ScheduleEntry, type ShareItem,
} from "@/lib/planner";

function ScopeForm({ items, initial, shareBackId, onClose, onSharedBack }: {
  items: ShareItem[]; initial?: CalendarShare; shareBackId?: string; onClose?: () => void; onSharedBack?: () => void;
}) {
  const router = useRouter();
  const { save, saving, error, setError, notice } = useSaveRecord("calendar_shares");
  const [scope, setScope] = useState<CalendarShare["scope"]>(initial?.scope ?? (shareBackId ? "selected" : "all"));
  const [sharingBack, setSharingBack] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const categories = scope === "selected" ? fields.getAll("categories").map(String) : [];
    const item_ids = scope === "selected" ? fields.getAll("item_ids").map(String) : [];
    if (scope === "selected" && !categories.length && !item_ids.length) {
      setError("Choose at least one category or item to share.");
      return;
    }
    if (item_ids.length > 200) {
      setError("Choose up to 200 items, or share a category.");
      return;
    }
    if (shareBackId) {
      setSharingBack(true);
      setError("");
      try {
        const { error } = await createClient().rpc("share_calendar_back", {
          p_incoming_share_id: shareBackId, p_scope: scope, p_categories: categories, p_item_ids: item_ids,
        });
        if (error) {
          setError(error.code === "P0001" ? error.message : "Could not share your calendar. Try again.");
          return;
        }
        onSharedBack?.();
        router.refresh();
      } catch {
        setError("Could not share your calendar. Check your connection.");
      } finally {
        setSharingBack(false);
      }
      return;
    }
    if (await save({ scope, categories, item_ids }, initial?.id)) {
      if (!initial) {
        setScope("all");
        form.reset();
      }
      onClose?.();
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset className="space-y-4" disabled={saving || sharingBack}>
        <Field label="What can your roommate see?">
          <select className="control" value={scope} onChange={(event) => setScope(event.target.value === "all" ? "all" : "selected")}>
            <option value="all">All shareable calendar items</option>
            <option value="selected">Selected categories or items</option>
          </select>
        </Field>
        {scope === "selected" && (
          <>
            <fieldset>
              <legend className="text-sm font-semibold">Categories</legend>
              <div className="mt-2 flex flex-wrap gap-2.5">
                {SHARE_CATEGORIES.map((category) => (
                  <label key={category} className="flex items-center gap-1.5">
                    <input type="checkbox" className="accent-brand-700" name="categories" value={category} defaultChecked={initial?.categories.includes(category)} />
                    <CategoryBadge kind={category} />
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Individual items</legend>
              {items.length ? (
                <div className="max-h-56 space-y-1.5 overflow-auto rounded-lg border border-slate-200 p-2">
                  {items.map((item) => (
                    <label key={item.kind + ":" + item.id} className="flex items-start gap-2 rounded-md p-2 text-sm hover:bg-brand-50">
                      <input type="checkbox" className="mt-1 accent-brand-700" name="item_ids" value={item.id} defaultChecked={initial?.item_ids.includes(item.id)} />
                      <span className="min-w-0 break-words">
                        {item.title}<span className="mt-0.5 block text-xs text-slate-600">{CATEGORIES[item.kind].label} · {VISIBILITIES[item.visibility]}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : <EmptyState>Set an item’s visibility to Busy or Shared before choosing it here.</EmptyState>}
            </fieldset>
          </>
        )}
        <FormActions saving={saving || sharingBack} error={error} notice={notice} label={shareBackId ? "Share my calendar" : "Create invite"}
          editing={!!initial} onCancel={onClose} />
      </fieldset>
    </form>
  );
}

function AcceptInvite({ onAccepted }: { onAccepted: (code: string) => void }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const code = field(new FormData(form), "code").toLowerCase();
    setError("");
    setNotice("");
    if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(code)) {
      setError("Paste the full invite code.");
      return;
    }
    setWorking(true);
    try {
      const { error } = await createClient().rpc("accept_calendar_share", { p_code: code });
      if (error) {
        setError(error.code === "P0001" ? error.message : "Could not accept the invite. Try again.");
        return;
      }
      form.reset();
      setNotice("Calendar added to Shared with you.");
      onAccepted(code);
      router.refresh();
    } catch {
      setError("Could not accept the invite. Check your connection.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <form onSubmit={accept}>
      <fieldset disabled={working} className="space-y-4">
        <Field label="Invite code">
          <input className="control" name="code" autoComplete="off" spellCheck={false} maxLength={40} required placeholder="Paste a roommate’s code" />
        </Field>
        <button type="submit" className="button-secondary" disabled={working}>{working ? "Accepting…" : "Accept invite"}</button>
        {error && <LoadError>{error}</LoadError>}
        {notice && <p className="feedback-ok" role="status">{notice}</p>}
      </fieldset>
    </form>
  );
}

function InviteCode({ id }: { id: string }) {
  const [notice, setNotice] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setNotice("Code copied.");
    } catch {
      setNotice("Select and copy the code from the box.");
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <Field label="One-time invite code">
        <input className="control font-mono text-xs" value={id} readOnly onFocus={(event) => event.target.select()} />
      </Field>
      <button className="button-secondary" onClick={copy} type="button">Copy code</button>
      {notice && <span className="ml-2 text-xs text-slate-700" role="status">{notice}</span>}
    </div>
  );
}

export default function ShareWorkspace({
  owned, received, items, incoming, scheduleError, userId, conversation, pendingFrom, threadError,
}: {
  owned: CalendarShare[]; received: CalendarShare[]; items: ShareItem[]; incoming: ScheduleEntry[]; scheduleError: boolean;
  userId: string; conversation: string; pendingFrom: string[]; threadError: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [acceptedCode, setAcceptedCode] = useState("");
  const [shareBack, setShareBack] = useState<CalendarShare | null>(null);
  const [sharedNotice, setSharedNotice] = useState("");
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const updateCount = useCallback((id: string, count: number) => {
    setLiveCounts((current) => current[id] === count ? current : { ...current, [id]: count });
  }, []);
  const pendingCount = (id: string) => liveCounts[id] ?? pendingFrom.filter((sender) => sender === id).length;
  const contacts = new Map<string, { id: string; label: string; calendar?: CalendarShare }>();
  for (const share of owned) {
    if (share.viewer_id) contacts.set(share.viewer_id, { id: share.viewer_id, label: share.viewer_label ?? "Friend" });
  }
  for (const share of received) {
    contacts.set(share.owner_id, { id: share.owner_id, label: share.owner_label, calendar: share });
  }
  const friends = [...contacts.values()].sort((a, b) => a.label.localeCompare(b.label));
  const requested = received.find((share) => share.id === conversation)?.owner_id;
  const [selection, setSelection] = useState(requested ?? "");
  const [openThreadId, setOpenThreadId] = useState(requested ?? "");
  const justAccepted = received.find((share) => share.id === acceptedCode);
  const friend = contacts.get(selection) ?? contacts.get(justAccepted?.owner_id ?? "")
    ?? friends.find((person) => pendingCount(person.id) > 0) ?? friends[0];
  const pending = friend ? pendingCount(friend.id) : 0;
  const chatFriend = !threadError ? contacts.get(openThreadId) : undefined;
  const shareBackCandidate = friend?.calendar && !owned.some((share) => share.viewer_id === friend.id)
    ? friend.calendar : undefined;

  return (
    <div className="editor-grid">
      <EditorRail>
        <Panel title="Share your calendar" caption="Create a code and give it to one roommate. They can redeem it while signed in to TomorrowOS.">
          <ScopeForm items={items} />
        </Panel>
        <Panel title="Accept an invite" caption="Paste a code you got from someone you know.">
          <AcceptInvite onAccepted={(code) => {
            setSelection("");
            setAcceptedCode(code);
            setSharedNotice("");
          }} />
        </Panel>
      </EditorRail>
      <EditorResults label="Friend calendars">
        <Panel title="Friends" caption="Choose whose calendar to see or open a private conversation.">
          {threadError && <LoadError>Could not load messages and suggestions. Refresh after the database update is installed.</LoadError>}
          {friend ? (
            <div className="space-y-4">
              <Field label="Friend">
                <select className="control" value={friend.id} onChange={(event) => {
                  setSelection(event.target.value);
                  setSharedNotice("");
                }}>
                  {friends.map((person) => <option value={person.id} key={person.id}>
                    {person.label}{pendingCount(person.id) > 0 ? " · requests to review" : ""}
                  </option>)}
                </select>
              </Field>
              <div className="flex flex-wrap items-center gap-2">
                {friend.calendar && <>
                  <Link prefetch={false} className="button-secondary" href={"/calendar?scope=shared&friend=" + friend.calendar.id}>View separately</Link>
                  <Link prefetch={false} className="button-secondary" href={"/calendar?scope=all&friend=" + friend.calendar.id}>View with mine</Link>
                </>}
                {!threadError && (
                  <button className="button-primary" type="button" aria-haspopup="dialog"
                    onClick={() => setOpenThreadId(friend.id)}>
                    Messages{pending > 0 && " · " + pending + " to review"}
                  </button>
                )}
              </div>
              {sharedNotice && <p className="feedback-ok" role="status">{sharedNotice}</p>}
              {shareBackCandidate && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-950" role={justAccepted?.id === shareBackCandidate.id ? "status" : undefined}>
                      Share your calendar back
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-700">You’re connected. Choose what this friend can see on your calendar.</p>
                  </div>
                  <button type="button" className="button-secondary" onClick={() => setShareBack(shareBackCandidate)}>
                    Share back
                  </button>
                </div>
              )}
              {!friend.calendar && <p className="text-sm text-slate-600">You share your calendar with this friend. Accept their invite to see theirs too.</p>}
            </div>
          ) : <EmptyState>Accept an invite, or have a friend accept yours, to start a conversation.</EmptyState>}
        </Panel>
        <Panel stickyHeading title="Shared with you" caption="Roommate availability and events over the next 14 days.">
          {!received.length ? <EmptyState>Accept an invite to see another calendar.</EmptyState> : (
            <>
              <ul className="mb-4 space-y-2">
                {received.map((share) => (
                  <li key={share.id} className="record flex items-center justify-between gap-2 p-3">
                    <span className="min-w-0 break-words text-sm font-semibold">{share.owner_label}</span>
                    <DeleteRecord table="calendar_shares" id={share.id} label="Leave"
                      question="Remove this calendar from Shared with you?" />
                  </li>
                ))}
              </ul>
              {scheduleError ? <LoadError /> : incoming.length ? (
                <ul className="max-h-[34rem] space-y-2.5 overflow-auto pr-1">
                  {incoming.map((item) => (
                    <li className="record p-3" key={item.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <CategoryBadge kind={item.kind} /><span className="break-all text-xs text-slate-600">{item.owner_label}</span>
                      </div>
                      <p className="mt-2 break-words text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-700">{dateLabel(item.item_date, { weekday: "short", month: "short", day: "numeric" })} · {entryTime(item)}</p>
                      {item.location && <p className="mt-1 text-xs text-slate-600">{item.location}</p>}
                    </li>
                  ))}
                </ul>
              ) : <EmptyState>No shared items in the next 14 days.</EmptyState>}
            </>
          )}
        </Panel>

        <Panel title="Your invites and shares" caption="Private items stay hidden. Busy entries only show availability.">
          {!owned.length && <EmptyState>No invites yet. Create one to share your schedule.</EmptyState>}
          <ul className="space-y-3">
            {owned.map((share) => (
              <li className="record" key={share.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{share.viewer_label ?? "Waiting for your roommate"}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {share.scope === "all" ? "All shareable items" : [
                        ...share.categories.map((category) => CATEGORIES[category].label),
                        share.item_ids.length ? share.item_ids.length + " selected items" : "",
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {editing !== share.id && <div className="flex gap-1">
                    <button type="button" className="button-quiet text-brand-800" onClick={() => setEditing(share.id)}>Edit scope</button>
                    <DeleteRecord table="calendar_shares" id={share.id} label="Revoke"
                      question="Revoke this invite or share? The roommate will lose access." />
                  </div>}
                </div>
                {editing === share.id ? (
                  <div className="mt-4"><ScopeForm items={items} initial={share} onClose={() => setEditing(null)} /></div>
                ) : !share.viewer_id && <InviteCode id={share.id} />}
              </li>
            ))}
          </ul>
        </Panel>
      </EditorResults>
      {chatFriend && <FriendConversation key={chatFriend.id} friendId={chatFriend.id} friendLabel={chatFriend.label}
        userId={userId} shareId={chatFriend.calendar?.id} onPendingChange={updateCount} onClose={() => setOpenThreadId("")} />}
      {shareBack && (
        <PlannerDialog title="Share your calendar back"
          caption={"Choose what " + shareBack.owner_label + " can see. Private items stay private."}
          onClose={() => setShareBack(null)}>
          <ScopeForm items={items} shareBackId={shareBack.id} onClose={() => setShareBack(null)} onSharedBack={() => {
            setShareBack(null);
            setSharedNotice("Calendar shared with your friend.");
          }} />
        </PlannerDialog>
      )}
    </div>
  );
}
