"use client";

import Link from "next/link";
import { useState } from "react";
import EventForm from "@/components/forms/EventForm";
import PlannerDialog from "@/components/planner/PlannerDialog";
import { DeleteRecord } from "@/components/planner/mutations";
import { EditorRail, EditorResults, EmptyState, Panel } from "@/components/planner/ui";
import { VISIBILITIES, dateLabel, instantDate, intervalLabel, type EventItem } from "@/lib/planner";
import { personalInterval, repeatLabel, type PersonalTiming } from "@/lib/personal-repeats";

type EventFilter = "upcoming" | "past" | "all";

export default function PersonalWorkspace({ events, now, initialFilter }: {
  events: EventItem[]; now: string; initialFilter: EventFilter;
}) {
  const [filter, setFilter] = useState<EventFilter>(initialFilter);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [notice, setNotice] = useState("");
  const nowMs = Date.parse(now);
  const today = instantDate(now);
  const query = search.trim().toLowerCase();
  const intervals = events.map(event => ({ event, ...personalInterval(event, now) }))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const upcoming = intervals.filter(({ end }) => Date.parse(end) >= nowMs);
  const past = intervals.filter(({ end }) => Date.parse(end) < nowMs).reverse();
  const candidates = filter === "upcoming" ? upcoming : filter === "past" ? past : [...upcoming, ...past];
  const shown = candidates.filter(({ event }) => !query || (event.title + " " + event.location).toLowerCase().includes(query));

  function showSaved(timing: PersonalTiming) {
    if (filter !== "all") setFilter(Date.parse(personalInterval(timing, now).end) < nowMs ? "past" : "upcoming");
    setSearch("");
  }

  return (
    <div className="editor-grid">
      <EditorRail id="add-personal-event">
        <Panel title="Add a personal event" caption="Times are in Halifax time. New events are private by default.">
          <EventForm draft={{ date: today }} onSaved={(_date, timing) => { setNotice(""); showSaved(timing); }} />
        </Panel>
      </EditorRail>
      <EditorResults label="Personal event list">
        <Panel stickyHeading title="Your personal events" caption={upcoming.length + (upcoming.length === 1 ? " upcoming event" : " upcoming events")}
          action={
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Show
                <select className="control mt-1" value={filter} onChange={(event) => setFilter(event.target.value as EventFilter)}>
                  <option value="upcoming">Upcoming</option><option value="past">Past</option><option value="all">All events</option>
                </select>
              </label>
              <label className="min-w-0 text-xs font-semibold text-slate-600">Find an event
                <input type="search" className="control mt-1 w-full max-w-40" value={search} placeholder="e.g. Gym"
                  onChange={(event) => setSearch(event.target.value)} />
              </label>
            </div>
          }>
          {notice && <p role="status" className="feedback-ok mb-4">{notice}</p>}
          {shown.length ? (
            <div className="space-y-3">
              {shown.map(({ event, start, end }) => {
                const day = instantDate(start);
                return (
                  <article id={"event-" + event.id} key={event.id} className="record flex items-start gap-3 sm:gap-4">
                    <time dateTime={day} className="grid size-13 shrink-0 place-content-center rounded-xl bg-[#eee8fa] text-center text-brand-900">
                      <span className="text-[.63rem] font-bold uppercase tracking-wide">{dateLabel(day, { month: "short" })}</span>
                      <span className="text-lg leading-none font-semibold">{Number(day.slice(-2))}</span>
                    </time>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold">{event.title}</h3>
                      <p className="mt-1 text-sm text-slate-700">{intervalLabel(start, end)}{" · "}{VISIBILITIES[event.visibility]}</p>
                      {event.repeat_until && <p className="mt-1 text-xs font-semibold text-brand-800">{repeatLabel(event.repeat_until, event.repeat_every_weeks)}</p>}
                      {event.location && <p className="mt-1 break-words text-sm text-slate-600">{event.location}</p>}
                      {event.notes && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{event.notes}</p>}
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Link prefetch={false} className="button-quiet text-brand-800" href={"/calendar?view=day&date=" + day}>View day</Link>
                        <button className="button-quiet text-brand-800" type="button" onClick={() => { setNotice(""); setEditing(event); }}>{event.repeat_until ? "Edit series" : "Edit"}</button>
                        <DeleteRecord table="events" id={event.id}
                          question={event.repeat_until ? "Delete this event and all its repeats?" : "Delete this personal event?"}
                          onDeleted={() => setNotice(event.repeat_until ? "Series deleted." : "Event deleted.")} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState>{query ? "No events match your search." :
              filter === "upcoming" ? "No upcoming personal events. Add one here, or switch to Past to see earlier plans." :
                filter === "past" ? "No past personal events." : "Add a personal event and it will appear here and on your calendar."}</EmptyState>
          )}
        </Panel>
      </EditorResults>
      {editing && (
        <PlannerDialog title={editing.repeat_until ? "Edit personal series" : "Edit personal event"}
          caption={editing.repeat_until ? "Changes apply to the entire series. Times are in Halifax time." : "Times are in Halifax time."}
          onClose={() => setEditing(null)}>
          <EventForm key={editing.id} initialEvent={editing} onCancel={() => setEditing(null)}
            onSaved={(_date, timing) => { setEditing(null); showSaved(timing); setNotice("Event updated."); }} />
        </PlannerDialog>
      )}
    </div>
  );
}
