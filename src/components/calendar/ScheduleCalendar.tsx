"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import FullCalendar, { type CalendarOptions, type CalendarRef, type EventSourceFuncInfo, type EventInput } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import themePlugin from "@fullcalendar/react/themes/breezy";
import ContourField from "@/components/layout/ContourField";
import { useAppearance } from "@/components/layout/WorkspaceMotion";
import SceneWindow from "@/components/scenes/SceneWindow";
import EventForm, { type EventDraft } from "@/components/forms/EventForm";
import Icon from "@/components/planner/Icon";
import PlannerDialog from "@/components/planner/PlannerDialog";
import { DeleteRecord } from "@/components/planner/mutations";
import { CategoryBadge, LoadError, PageHeader } from "@/components/planner/ui";
import { createClient } from "@/lib/supabase/client";
import { repeatLabel } from "@/lib/personal-repeats";
import {
  CATEGORIES, DEADLINE_STATUSES, PLANNER_ZONE, VISIBILITIES, dateLabel, entryTime, instantDate, isDate, isTime, todayDate,
  type CalendarScope, type Category, type EventItem, type EventSuggestion, type ScheduleEntry, type SharedCalendar,
} from "@/lib/planner";

const plugins = [themePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin];
const views = [
  ["dayGridMonth", "Month"], ["timeGridWeek", "Week"], ["timeGridDay", "Day"], ["listWeek", "Agenda"],
] as const;
export type CalendarView = (typeof views)[number][0];
const categories = Object.keys(CATEGORIES) as Category[];
const viewOptions: CalendarOptions["views"] = {
  listWeek: {
    listDaysClass: "agenda-days",
    listDayClass: "agenda-day",
    listDayHeaderClass: "agenda-day-heading",
    listDayHeaderInnerClass: ({ level }) => level ? "agenda-duplicate-date" : "agenda-day-label",
    listDayFormat: { weekday: "long", month: "short", day: "numeric" },
    listDayBodyClass: "agenda-events",
    listItemEventClass: "agenda-event",
    listItemEventBeforeClass: "agenda-theme-dot",
    listItemEventInnerClass: "agenda-event-inner",
    noEventsText: "No events match this week.",
    eventContent: ({ event }) => {
      const item = event.extendedProps.item as ScheduleEntry;
      return (
        <div className="agenda-event-line">
          <span className="agenda-dot" aria-hidden="true" style={{ backgroundColor: CATEGORIES[item.kind].color }} />
          <div className="min-w-0">
            <p className="agenda-title font-semibold">{item.title}</p>
            {(item.subtitle || item.owner_label) && (
              <p className="mt-0.5 wrap-anywhere text-xs text-slate-600">
                {[item.subtitle, item.owner_label].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <span className="agenda-time text-sm text-slate-600">{entryTime(item)}</span>
        </div>
      );
    },
  },
};

type Editor =
  | { mode: "new"; draft: EventDraft; friend?: SharedCalendar }
  | { mode: "edit" }
  | { mode: "suggest"; target: EventSuggestion };

function formEvent(item: ScheduleEntry | null, id: string | null | undefined): EventItem | undefined {
  if (item?.kind !== "personal" || !id || !item.starts_at || !item.ends_at) return;
  return {
    id, title: item.title, starts_at: item.series_starts_at ?? item.starts_at, ends_at: item.series_ends_at ?? item.ends_at,
    location: item.location, notes: item.notes, visibility: item.visibility,
    repeat_until: item.repeat_until ?? null, repeat_every_weeks: item.repeat_every_weeks ?? 1,
  };
}

type ScheduleProps = {
  initialDate: string; initialView: CalendarView; initialScope: CalendarScope; initialFriend: string;
  calendars: SharedCalendar[]; sharingError: boolean;
};

const subscribeToInitialWidth = () => () => {};
const isPhoneWidth = () => window.matchMedia("(max-width: 47.999rem)").matches;

export default function ScheduleCalendar({ adaptiveView, ...props }: ScheduleProps & { adaptiveView: boolean }) {
  const phone = useSyncExternalStore<boolean | null>(subscribeToInitialWidth, isPhoneWidth, () => null);
  if (adaptiveView && phone === null) {
    return <div className="workspace calendar-workspace">
      <PageHeader eyebrow="Your time" title="Calendar" />
      <p role="status" className="text-sm text-slate-600">Opening your calendar…</p>
    </div>;
  }
  return <CalendarWorkspace {...props} initialView={adaptiveView && phone ? "listWeek" : props.initialView} />;
}

function CalendarWorkspace({
  initialDate, initialView, initialScope, initialFriend, calendars, sharingError,
}: ScheduleProps) {
  const calendar = useRef<CalendarRef>(null);
  const { theme } = useAppearance();
  const [filters, setFilters] = useState<Category[]>(categories);
  const [scope, setScope] = useState<CalendarScope>(initialScope);
  const [friendId, setFriendId] = useState(initialFriend);
  const [selected, setSelected] = useState<ScheduleEntry | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [title, setTitle] = useState(dateLabel(initialDate, { month: "long", year: "numeric" }));
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [view, setView] = useState<string>(initialView);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const friend = calendars.find((item) => item.id === friendId);
  const onlyFriend = scope === "shared" ? friend : undefined;

  const getEvents = useCallback(async (range: EventSourceFuncInfo): Promise<EventInput[]> => {
    try {
      const { data, error } = await createClient().rpc("planner_schedule", {
        p_from: range.startStr.slice(0, 10),
        p_to: range.endStr.slice(0, 10),
        p_scope: scope,
        ...(scope !== "mine" && friend ? { p_share_id: friend.id } : {}),
      });
      if (error) throw error;
      setError("");
      return ((data ?? []) as ScheduleEntry[]).filter((item) => filters.includes(item.kind)).map((item) => ({
        id: item.id, title: item.title,
        start: item.starts_at ?? item.item_date,
        end: item.ends_at ?? undefined,
        allDay: !item.starts_at,
        color: CATEGORIES[item.kind].color,
        contrastColor: "#fff",
        class: [item.status === "completed" && "opacity-65", item.share_id && "calendar-friend-item"].filter(Boolean).join(" "),
        extendedProps: { item },
      }));
    } catch {
      setError("Could not load the calendar. Check your connection and try again.");
      return [];
    }
  }, [filters, friend, scope]);

  const editableEvent = formEvent(selected, selected?.record_id);
  const suggestableEvent = formEvent(selected, selected?.shared_event_id);
  const suggestionTarget = selected?.share_id && selected.shared_event_revision && suggestableEvent
    ? { shareId: selected.share_id, eventId: suggestableEvent.id, revision: selected.shared_event_revision }
    : undefined;
  const proposal: EventSuggestion | undefined = editor?.mode === "suggest" ? editor.target
    : editor?.mode === "new" && editor.friend ? { shareId: editor.friend.id } : undefined;

  function closeDetails() {
    setSelected(null);
    setEditor(null);
  }

  function openNew(draft: EventDraft) {
    setNotice("");
    setSelected(null);
    setEditor({ mode: "new", draft, friend: onlyFriend });
  }

  function onSaved(date: string) {
    closeDetails();
    if (proposal) {
      setNotice("Suggestion sent. Your friend can review it in Shared.");
      return;
    }
    if (scope === "shared") setScope("mine");
    setFilters((current) => current.includes("personal") ? current : [...current, "personal"]);
    const api = calendar.current?.getApi();
    if (date !== currentDate && !(editor?.mode === "edit" && editableEvent?.repeat_until)) api?.gotoDate(date);
    api?.refetchEvents();
    setNotice("Event saved.");
  }

  return (
    <div className="workspace calendar-workspace">
      <PageHeader eyebrow="Your time" title="Calendar"
        description={onlyFriend ? "Click a date or time to suggest an event. All times are Halifax time."
          : "All times are Halifax time. Click a date or time to add a personal event."}
        action={
          <button className="button-primary" type="button" onClick={() => openNew({ date: currentDate })}>
            <Icon name="plus" className="size-4" />
            {onlyFriend ? "Suggest event" : <><span className="sm:hidden">Add event</span><span className="hidden sm:inline">Add personal event</span></>}
          </button>
        } />
      <SceneWindow placement="calendar" />
      <div className="panel calendar-panel space-y-4">
        <div className="calendar-tools space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1" aria-label="Calendar navigation">
                <button className="button-secondary px-2.5" aria-label="Previous" type="button"
                  onClick={() => { closeDetails(); calendar.current?.getApi().prev(); }}><Icon name="left" className="size-4" /></button>
                <button className="button-secondary" type="button"
                  onClick={() => { closeDetails(); calendar.current?.getApi().gotoDate(todayDate()); }}>Today</button>
                <button className="button-secondary px-2.5" aria-label="Next" type="button"
                  onClick={() => { closeDetails(); calendar.current?.getApi().next(); }}><Icon name="right" className="size-4" /></button>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <span className="sr-only">Jump to date</span>
                <input className="control mt-0 w-auto" type="date" value={currentDate} onChange={(event) => {
                  const value = event.target.value;
                  if (isDate(value)) {
                    closeDetails();
                    setCurrentDate(value);
                    calendar.current?.getApi().gotoDate(value);
                  }
                }} />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link prefetch={false} className="button-quiet text-brand-900" href="/personal"><Icon name="personal" className="size-4" />Personal events</Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
            <div className="calendar-segment inline-flex rounded-lg p-1" role="group" aria-label="Calendar layout">
              {views.map(([name, label]) => <button type="button" key={name} aria-pressed={view === name}
                className={"rounded-md px-2 py-2 text-xs font-semibold sm:px-3 sm:text-sm " +
                  (view === name ? "bg-white text-brand-900 shadow-sm" : "text-slate-700 hover:text-brand-900")}
                onClick={() => { closeDetails(); calendar.current?.getApi().changeView(name); }}>{label}</button>)}
            </div>
          </div>
          {calendars.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-3">
              <div role="group" aria-label="Whose calendar" className="calendar-segment inline-flex flex-wrap rounded-lg p-1">
                {([["mine", "Mine"], ["shared", "Friends only"], ["all", "Together"]] as const).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={scope === value}
                    className={"rounded-md px-2.5 py-2 text-xs font-semibold sm:text-sm " +
                      (scope === value ? "bg-white text-brand-900 shadow-sm" : "text-slate-700 hover:text-brand-900")}
                    onClick={() => { closeDetails(); setNotice(""); setScope(value); }}>{label}</button>
                ))}
              </div>
              {scope !== "mine" && (
                <label className="min-w-0 text-xs font-medium text-slate-700">
                  <span className="sr-only">Friend calendar</span>
                  <select className="control mt-0 max-w-56" value={friend?.id ?? ""} onChange={(event) => {
                    closeDetails(); setNotice(""); setFriendId(event.target.value);
                  }}>
                    <option value="">All friends</option>
                    {calendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.owner_label}</option>)}
                  </select>
                </label>
              )}
              {scope === "all" && <span className="text-xs text-slate-600">Dashed events are shared by friends.</span>}
            </div>
          )}
        </div>

        {sharingError && <LoadError>Could not open that shared calendar. Check your connections in <Link prefetch={false} className="underline" href="/shared">Shared</Link>.</LoadError>}
        {scope === "shared" && !calendars.length && !sharingError && (
          <p className="text-sm text-slate-700">Accept an invite in <Link prefetch={false} className="font-semibold text-brand-800 underline" href="/shared">Shared</Link> to see a friend’s calendar.</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="group" aria-label="Event categories">
          {categories.filter((category) => category !== "busy" || scope !== "mine").map((category) => (
            <label key={category} className="flex items-center gap-1.5 text-sm text-slate-700">
              <input type="checkbox" className="accent-brand-700" checked={filters.includes(category)}
                onChange={(event) => {
                  const checked = event.target.checked;
                  closeDetails();
                  setFilters((current) => checked ? [...current, category] : current.filter((value) => value !== category));
                }} />
              <CategoryBadge kind={category} />
            </label>
          ))}
        </div>
        {error && (
          <LoadError>{error}{" "}<button className="font-semibold underline" type="button"
            onClick={() => calendar.current?.getApi().refetchEvents()}>Retry</button></LoadError>
        )}
        {notice && <p role="status" className="feedback-ok">{notice}</p>}

        <div className="calendar-scene" data-color-scheme={theme} style={{ position: "relative", isolation: "isolate" }}>
          <ContourField variant="calendar" />
          <div className="calendar-frame overflow-x-auto">
            <div className={view === "timeGridWeek" ? "min-w-[660px]" : view === "dayGridMonth" ? "min-w-[365px]" : ""}>
              <FullCalendar
                ref={calendar} plugins={plugins} views={viewOptions} headerToolbar={false} initialView={initialView} initialDate={initialDate}
                timeZone={PLANNER_ZONE} firstDay={1} height={view === "dayGridMonth" || view === "listWeek" ? "auto" : 650}
                scrollTime="08:00:00" defaultTimedEventDuration="00:15:00" nowIndicator dayMaxEvents={3} eventInteractive
                events={getEvents}
                datesSet={(info) => {
                  const title = info.view.title;
                  const view = info.view.type;
                  const date = instantDate(info.view.calendar.getDate().toISOString());
                  queueMicrotask(() => {
                    if (!calendar.current) return;
                    setTitle(title);
                    setView(view);
                    setCurrentDate(date);
                  });
                }}
                dateClick={(info) => {
                  const time = info.dateStr.slice(11, 16);
                  openNew({ date: info.dateStr.slice(0, 10), time: !info.allDay && isTime(time) ? time : undefined });
                }}
                eventClick={(info) => {
                  setEditor(null);
                  setNotice("");
                  setSelected(info.event.extendedProps.item as ScheduleEntry);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {(selected || editor) && (
        <PlannerDialog
          title={editor?.mode === "edit" ? (editableEvent?.repeat_until ? "Edit personal series" : "Edit personal event") : editor?.mode === "suggest" ? "Suggest a change"
            : editor?.mode === "new" ? (proposal ? "Suggest an event" : "Add a personal event") : selected?.title ?? ""}
          caption={proposal ? "Your friend can approve or decline this suggestion in Shared. Times are in Halifax time."
            : editor?.mode === "edit" && editableEvent?.repeat_until ? "Changes apply to the entire series. Times are in Halifax time."
              : editor ? "Dates and times are in Halifax time." : undefined}
          onClose={closeDetails}>
          {editor ? (
            <EventForm key={editor.mode} refreshPage={false}
              initialEvent={editor.mode === "edit" ? editableEvent : editor.mode === "suggest" ? suggestableEvent : undefined}
              draft={editor.mode === "new" ? editor.draft : undefined} suggestion={proposal}
              onCancel={() => selected ? setEditor(null) : closeDetails()} onSaved={onSaved} />
          ) : selected && (
            <div className="space-y-2 text-sm leading-6 text-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge kind={selected.kind} />
                {selected.owner_label ? <span className="break-all">From {selected.owner_label}</span>
                  : <span>{VISIBILITIES[selected.visibility]}</span>}
              </div>
              {selected.subtitle && <p>{selected.subtitle}</p>}
              <p>{dateLabel(selected.item_date, { weekday: "long", month: "short", day: "numeric", year: "numeric" })} · {entryTime(selected)}</p>
              {selected.repeat_until && <p className="font-semibold text-brand-800">{repeatLabel(selected.repeat_until, selected.repeat_every_weeks ?? 1)}</p>}
              {selected.status && <p>{DEADLINE_STATUSES[selected.status]}</p>}
              {selected.location && <p className="flex items-center gap-2"><Icon name="location" className="size-4 shrink-0" />{selected.location}</p>}
              {selected.notes && <p className="whitespace-pre-wrap break-words">{selected.notes}</p>}
              {editableEvent ? (
                <div className="flex gap-2 pt-2">
                  <button type="button" className="button-secondary" onClick={() => setEditor({ mode: "edit" })}>
                    {editableEvent.repeat_until ? "Edit series" : "Edit event"}
                  </button>
                  <DeleteRecord table="events" id={editableEvent.id} label={editableEvent.repeat_until ? "Delete series" : "Delete event"}
                    question={editableEvent.repeat_until ? "Delete this event and all its repeats?" : "Delete this personal event?"}
                    refreshPage={false} onDeleted={() => {
                    closeDetails();
                    calendar.current?.getApi().refetchEvents();
                    setNotice(editableEvent.repeat_until ? "Series deleted." : "Event deleted.");
                  }} />
                </div>
              ) : selected.share_id ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {suggestionTarget && (
                    <button type="button" className="button-secondary"
                      onClick={() => setEditor({ mode: "suggest", target: suggestionTarget })}>Suggest a change</button>
                  )}
                  <Link prefetch={false} className="button-quiet text-brand-900" href={"/shared?conversation=" + selected.share_id}>Message friend</Link>
                </div>
              ) : selected.record_id && (
                <Link prefetch={false} className="button-secondary mt-2" href={CATEGORIES[selected.kind].href + "#" + CATEGORIES[selected.kind].anchor + "-" + selected.record_id}>
                  Open {CATEGORIES[selected.kind].label.toLowerCase()}
                </Link>
              )}
            </div>
          )}
        </PlannerDialog>
      )}
    </div>
  );
}
