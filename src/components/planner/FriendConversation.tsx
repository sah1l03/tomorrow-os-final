"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Temporal } from "temporal-polyfill";
import EventForm from "@/components/forms/EventForm";
import Icon from "@/components/planner/Icon";
import PlannerDialog from "@/components/planner/PlannerDialog";
import { EmptyState, LoadError } from "@/components/planner/ui";
import { clock, datedInterval, dateLabel, instantDate, todayDate, type CalendarActivity } from "@/lib/planner";
import { createClient } from "@/lib/supabase/client";

const pageSize = 40;
const labels = { pending: "Waiting for approval", approved: "Approved", declined: "Declined" };

function mergeActivity(current: CalendarActivity[], fetched: CalendarActivity[]) {
  const items = new Map(current.map((item) => [item.id, item]));
  let changed = false;
  for (const item of fetched) {
    const existing = items.get(item.id);
    if (!existing || (existing.status === "pending" && item.status !== "pending")) {
      items.set(item.id, item);
      changed = true;
    }
  }
  return changed ? [...items.values()].sort((a, b) =>
    Temporal.Instant.compare(a.created_at, b.created_at) || (a.id < b.id ? -1 : a.id === b.id ? 0 : 1)) : current;
}

function SuggestionCard({ item, mine, disabled, onResolve }: {
  item: CalendarActivity; mine: boolean; disabled: boolean; onResolve: (id: string, approve: boolean) => void;
}) {
  if (!item.status || !item.proposed_start || !item.proposed_end) return null;
  const edit = !!item.original_title;
  return (
    <div className="chat-request">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="text-[.68rem] font-bold uppercase tracking-wide text-brand-800">{edit ? "Change request" : "New event request"}</span>
        <span className={"rounded-full px-2 py-1 text-xs font-semibold " + (item.status === "approved" ?
          "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700")}>{labels[item.status]}</span>
      </div>
      {edit && item.original_start && item.original_end && (
        <p className="mt-2 wrap-anywhere text-xs leading-5 text-slate-600">
          Before: {item.original_title} · {datedInterval(item.original_start, item.original_end)}
        </p>
      )}
      <p className="mt-2 wrap-anywhere font-semibold">{item.proposed_title}</p>
      <p className="text-sm text-slate-700">{datedInterval(item.proposed_start, item.proposed_end)}</p>
      {!mine && item.status === "pending" && (
        <div className="mt-2.5 space-y-2">
          {!edit && <p className="text-xs text-slate-600">This adds a private personal event to your calendar.</p>}
          <div className="flex flex-wrap gap-2">
            <button className="button-primary" type="button" disabled={disabled} onClick={() => onResolve(item.id, true)}>
              {edit ? "Approve change" : "Add to my calendar"}
            </button>
            <button className="button-secondary" type="button" disabled={disabled} onClick={() => onResolve(item.id, false)}>Decline</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FriendConversation({ friendId, friendLabel, userId, shareId, onClose, onPendingChange }: {
  friendId: string; friendLabel: string; userId: string; shareId?: string; onClose: () => void;
  onPendingChange: (friendId: string, count: number) => void;
}) {
  const hintId = useId();
  const [thread, setThread] = useState<CalendarActivity[] | null>(null);
  const [pending, setPending] = useState<CalendarActivity[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [readingOlder, setReadingOlder] = useState(false);
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const [draft, setDraft] = useState("");
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [disconnected, setDisconnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const restoreHistory = useRef<{ top: number; height: number } | null>(null);
  const initialLoaded = useRef(false);
  const inFlight = useRef<AbortController | null>(null);
  const sendingNow = useRef(false);

  const stopLoading = useCallback(() => inFlight.current?.abort(), []);
  const load = useCallback(async (force = false) => {
    if (inFlight.current && !force) return;
    stopLoading();
    const request = new AbortController();
    inFlight.current = request;
    try {
      const client = createClient();
      const [history, requests] = await Promise.all([
        client.rpc("calendar_thread_page", { p_friend_id: friendId }).abortSignal(request.signal),
        client.from("calendar_activity").select("*").eq("sender_id", friendId).eq("recipient_id", userId)
          .eq("status", "pending").order("created_at").limit(60).abortSignal(request.signal),
      ]);
      if (request.signal.aborted) return;
      if (history.error?.code === "P0001") {
        setThread([]);
        setPending([]);
        onPendingChange(friendId, 0);
        setHasOlder(false);
        setDisconnected(true);
        setLoadError(history.error.message);
        initialLoaded.current = false;
        return;
      }
      if (history.error || requests.error) throw history.error ?? requests.error;
      const rows = (history.data ?? []) as CalendarActivity[];
      if (!initialLoaded.current) {
        setHasOlder(rows.length > pageSize);
        initialLoaded.current = true;
      }
      setThread((current) => mergeActivity(current ?? [], rows.slice(-pageSize)));
      const openRequests = (requests.data ?? []) as CalendarActivity[];
      setPending(openRequests);
      onPendingChange(friendId, openRequests.length);
      setDisconnected(false);
      setLoadError("");
    } catch {
      if (!request.signal.aborted) setLoadError("Could not load this conversation. Try refreshing.");
    } finally {
      if (inFlight.current === request) inFlight.current = null;
    }
  }, [friendId, onPendingChange, stopLoading, userId]);

  useEffect(() => {
    const refresh = () => { if (!document.hidden) void load(); };
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      stopLoading();
    };
  }, [load, stopLoading]);

  useLayoutEffect(() => {
    const box = log.current;
    if (!box) return;
    const restore = restoreHistory.current;
    if (restore) {
      box.scrollTop = restore.top + (box.scrollHeight - restore.height);
      restoreHistory.current = null;
    } else if (followLatest.current) {
      box.scrollTop = box.scrollHeight;
    }
  }, [thread, hasOlder]);

  function handleScroll() {
    const box = log.current;
    if (!box) return;
    const nearEnd = box.scrollHeight - box.clientHeight - box.scrollTop < 52;
    followLatest.current = nearEnd;
    setAwayFromLatest(!nearEnd);
  }

  function jumpToLatest() {
    const box = log.current;
    followLatest.current = true;
    if (box) box.scrollTop = box.scrollHeight;
    setAwayFromLatest(false);
  }

  async function loadOlder() {
    const oldest = thread?.[0];
    if (!oldest || readingOlder) return;
    setReadingOlder(true);
    setActionError("");
    try {
      const { data, error } = await createClient().rpc("calendar_thread_page", {
        p_friend_id: friendId, p_before: oldest.created_at, p_before_id: oldest.id,
      });
      if (error) throw error;
      const rows = (data ?? []) as CalendarActivity[];
      const box = log.current;
      if (box && !followLatest.current) {
        restoreHistory.current = { top: box.scrollTop, height: box.scrollHeight };
      }
      setHasOlder(rows.length > pageSize);
      setThread((current) => mergeActivity(current ?? [], rows.slice(-pageSize)));
    } catch {
      setActionError("Could not load older messages. Try again.");
    } finally {
      setReadingOlder(false);
    }
  }

  function handleComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey ||
      event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    event.preventDefault();
    if (!event.repeat && !sendingNow.current && draft.trim()) event.currentTarget.form?.requestSubmit();
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sendingNow.current || disconnected) return;
    sendingNow.current = true;
    setSending(true);
    setActionError("");
    setNotice("");
    try {
      const { data, error } = await createClient().from("calendar_activity")
        .insert({ recipient_id: friendId, body }).select("*").single();
      if (error || !data) throw error ?? new Error("No message returned");
      followLatest.current = true;
      setAwayFromLatest(false);
      setDraft((current) => current === draft ? "" : current);
      setThread((current) => mergeActivity(current ?? [], [data as CalendarActivity]));
      setNotice("Message sent.");
      void load(true);
    } catch {
      setActionError("Could not send your message. Check your connection and try again.");
    } finally {
      sendingNow.current = false;
      setSending(false);
    }
  }

  async function resolve(id: string, approve: boolean) {
    setResolving(true);
    setActionError("");
    setNotice("");
    try {
      const { error } = await createClient().rpc("resolve_calendar_suggestion", { p_id: id, p_approve: approve });
      if (error) {
        setActionError(error.code === "P0001" ? error.message : "Could not review this suggestion. Try again.");
        return;
      }
      setNotice(approve ? "Approved and saved to your calendar." : "Suggestion declined.");
      setThread((current) => current?.map((item) => item.id === id ? { ...item, status: approve ? "approved" : "declined" } : item) ?? null);
      setPending((current) => current.filter((item) => item.id !== id));
      setReviewing(false);
      void load(true);
    } catch {
      setActionError("Could not review this suggestion. Check your connection and try again.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <PlannerDialog title={friendLabel} caption="Messages & calendar requests" variant="conversation" onClose={onClose}
      leading={<span className="chat-avatar" aria-hidden="true">{friendLabel.slice(0, 1).toUpperCase()}</span>}>
      <section className="friend-chat" aria-label="Private conversation">
        <div className="chat-toolbar">
          <span className="chat-toolbar-label">Conversation</span>
          <div className="flex flex-wrap items-center gap-1">
            {pending.length > 0 && (
              <button type="button" className="button-quiet bg-brand-100 text-brand-900"
                onClick={() => { setActionError(""); setReviewing(true); }}>Review ({pending.length})</button>
            )}
            {shareId && !disconnected && <button type="button" className="button-quiet text-brand-800"
              onClick={() => setSuggesting(true)}>Suggest event</button>}
            <button type="button" className="button-quiet text-brand-800" onClick={() => void load(true)}>Refresh</button>
          </div>
        </div>
        <div className="chat-log-frame">
          <div ref={log} className="chat-log" tabIndex={0} role="region" aria-label="Message history" onScroll={handleScroll}>
            {loadError && <LoadError>{loadError}</LoadError>}
            {thread === null && !loadError && <p className="chat-empty" role="status">Loading conversation…</p>}
            {thread?.length === 0 && !loadError && <p className="chat-empty">No messages yet. Start with a hello or a plan.</p>}
            {!!thread?.length && (
              <ol className="chat-history" aria-label="Messages in chronological order">
                {hasOlder && (
                  <li className="chat-day">
                    <button type="button" className="button-quiet bg-white text-brand-900" disabled={readingOlder}
                      onClick={loadOlder}>{readingOlder ? "Loading…" : "Load older messages"}</button>
                  </li>
                )}
                {thread.map((item, index) => {
                  const mine = item.sender_id === userId;
                  const day = instantDate(item.created_at);
                  const prevDay = index > 0 ? instantDate(thread[index - 1].created_at) : "";
                  return (
                    <li key={item.id} className="chat-message" data-message-id={item.id}>
                      {day !== prevDay && (
                        <div className="chat-day"><time dateTime={day}>{dateLabel(day, { weekday: "short", month: "short", day: "numeric" })}</time></div>
                      )}
                      <div className={"chat-bubble" + (mine ? " chat-bubble-mine" : " chat-bubble-theirs") + (item.status ? " chat-bubble-request" : "")}>
                        <span className="sr-only">{mine ? "You" : friendLabel}: </span>
                        {item.body && <p className="chat-message-text">{item.body}</p>}
                        <SuggestionCard item={item} mine={mine} disabled={resolving} onResolve={resolve} />
                        <time className="chat-time" dateTime={item.created_at}>{clock(item.created_at)}</time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          {awayFromLatest && !disconnected && (
            <button type="button" className="chat-jump button-secondary" onClick={jumpToLatest}>
              <Icon name="down" className="size-4" /> Jump to latest
            </button>
          )}
        </div>
        <div className="chat-footer">
          {actionError && !reviewing && <LoadError>{actionError}</LoadError>}
          <p role="status" className="sr-only">{notice}</p>
          <form onSubmit={send} className="chat-composer">
            <label className="sr-only" htmlFor={hintId + "-message"}>Message</label>
            <textarea id={hintId + "-message"} className="chat-input" name="message" value={draft} rows={2}
              maxLength={1000} aria-describedby={hintId} placeholder="Type a message" disabled={disconnected}
              onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKey} />
            <button type="submit" className="chat-send" aria-label="Send message" title="Send message"
              disabled={sending || disconnected || !draft.trim()}>
              <Icon name="send" className="size-5" />
            </button>
          </form>
          <p id={hintId} className="chat-hint">Enter to send · Shift + Enter for a new line</p>
        </div>
      </section>
      {reviewing && (
        <PlannerDialog title="Calendar requests" caption="Review a proposal before changing your calendar." onClose={() => setReviewing(false)}>
          {actionError && <LoadError>{actionError}</LoadError>}
          {pending.length ? (
            <div className="space-y-3">
              {pending.map((item) => <SuggestionCard key={item.id} item={item} mine={false} disabled={resolving} onResolve={resolve} />)}
            </div>
          ) : <EmptyState>You have no requests waiting for approval.</EmptyState>}
        </PlannerDialog>
      )}
      {suggesting && shareId && (
        <PlannerDialog title="Suggest an event" caption="Your friend will review this before it’s added. Times are in Halifax time."
          onClose={() => setSuggesting(false)}>
          <EventForm draft={{ date: todayDate() }} suggestion={{ shareId }} onCancel={() => setSuggesting(false)}
            onSaved={() => {
              setSuggesting(false);
              setNotice("Suggestion sent.");
              followLatest.current = true;
              setAwayFromLatest(false);
              void load(true);
            }} />
        </PlannerDialog>
      )}
    </PlannerDialog>
  );
}
