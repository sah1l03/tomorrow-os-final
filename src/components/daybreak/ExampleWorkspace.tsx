"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import Brand from "@/components/layout/Brand";
import Icon from "@/components/planner/Icon";
import PlannerDialog from "@/components/planner/PlannerDialog";
import { Field } from "@/components/planner/ui";
import { nextEntry } from "@/lib/focus-schedule";
import { addDays, dateLabel, entryTime, field, mondayOf, onDay, wallInstant, type Category, type ScheduleEntry } from "@/lib/planner";
import { Card, FocusCard, Timeline, WeekStrip } from "./TodayCards";

function exampleEvent(id: string, kind: Category, title: string, date: string, from: string, to: string, location = ""): ScheduleEntry {
  return {
    id, record_id: null, kind, title, item_date: date,
    starts_at: wallInstant(date, from), ends_at: to ? wallInstant(date, to) : null,
    subtitle: "", location, notes: "", status: null, visibility: "private",
    owner_label: null, share_id: null, shared_event_id: null, shared_event_revision: null,
    repeat_until: null, repeat_every_weeks: null, series_starts_at: null, series_ends_at: null,
  };
}

function exampleWeek(date: string) {
  return [
    exampleEvent("lecture", "class", "Algorithms lecture", date, "10:30", "11:45", "Computer Science · Room 127"),
    exampleEvent("outline", "deadline", "Submit project outline", date, "14:00", ""),
    exampleEvent("desk", "work", "Campus help desk", date, "15:30", "18:00", "Student centre"),
    exampleEvent("gym", "personal", "Gym session", date, "18:30", "19:30", "Rec centre"),
    exampleEvent("lab", "class", "Data science lab", addDays(date, 1), "09:30", "11:00", "Lab 204"),
    exampleEvent("dinner", "personal", "Dinner with roommates", addDays(date, 1), "19:00", "20:15"),
    exampleEvent("shift", "work", "Evening shift", addDays(date, 2), "16:00", "21:00"),
    exampleEvent("study", "personal", "Study session", addDays(date, 4), "14:00", "15:00", "Library"),
  ];
}

const sampleTasks = ["Review lecture notes", "Pack gym bag", "Email lab partner"];

export default function ExampleWorkspace({ today, now }: { today: string; now: string }) {
  const [entries, setEntries] = useState(() => exampleWeek(today));
  const [activeDay, setActiveDay] = useState(today);
  const [done, setDone] = useState(["Email lab partner"]);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<ScheduleEntry | null>(null);
  const [error, setError] = useState("");
  const week = mondayOf(activeDay);
  const timeline = entries.filter((entry) => onDay(entry, activeDay));
  const next = nextEntry(entries, today, now);

  function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const date = field(values, "date");
    const title = field(values, "title");
    try {
      if (!title) throw new Error("Enter an event title.");
      const item = exampleEvent(crypto.randomUUID(), "personal", title, date, field(values, "start_time"), field(values, "end_time"));
      if (Date.parse(item.ends_at!) <= Date.parse(item.starts_at!)) throw new Error("Choose an end time after the start time.");
      setEntries((old) => [...old, item].sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? "")));
      setActiveDay(date);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check the event details.");
    }
  }

  return (
    <main className="tos-example">
      <header className="tos-example-nav">
        <Link href="/" aria-label="TomorrowOS home"><Brand /></Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/login" className="button-secondary">Log in</Link>
          <Link href="/signup" className="button-primary">Create account</Link>
        </div>
      </header>
      <div className="tos-example-content">
        <div className="tos-example-heading">
          <div><p className="tos-kicker"><Icon name="sunrise" className="size-4" /> Example week</p>
            <h1>A day in TomorrowOS</h1><p>Try a sample event or check off a task. Changes stay in this example.</p></div>
          <button type="button" className="button-primary" onClick={() => { setError(""); setEditing(true); }}>
            <Icon name="plus" className="size-4" /> Add sample event
          </button>
        </div>
        <FocusCard entry={next} today={today} now={now}>
          {next && <button type="button" className="tos-hero-link" onClick={() => setSelected(next)}>View details<Icon name="arrow" className="size-4" /></button>}
        </FocusCard>
        <div className="tos-today-columns">
          <Card title={activeDay === today ? "Today’s timeline" : dateLabel(activeDay, { weekday: "long", month: "short", day: "numeric" })} kicker="Example schedule"
            action={<span className="tos-count">{timeline.length} {timeline.length === 1 ? "item" : "items"}</span>}
            footer={<span className="tos-muted">All times in Halifax</span>}>
            {timeline.length ? <Timeline entries={timeline} today={activeDay} onSelect={setSelected} />
              : <p className="tos-empty">Nothing on this example day.</p>}
          </Card>
          <div className="tos-today-stack">
            <Card title="This week" subtitle={dateLabel(week) + " – " + dateLabel(addDays(week, 6))}
              action={<div className="flex gap-1">
                <button type="button" className="button-secondary tos-small-button" aria-label="Previous week" onClick={() => setActiveDay(addDays(activeDay, -7))}><Icon name="left" className="size-4" /></button>
                <button type="button" className="button-secondary tos-small-button" aria-label="Next week" onClick={() => setActiveDay(addDays(activeDay, 7))}><Icon name="right" className="size-4" /></button>
              </div>}>
              <WeekStrip week={week} today={today} entries={entries} activeDay={activeDay} onDayChange={setActiveDay} />
            </Card>
            <Card title="Quick tasks" subtitle={done.length + " of " + sampleTasks.length + " complete"}>
              <div className="tos-progress" role="progressbar" aria-label="Example tasks complete" aria-valuemin={0} aria-valuemax={sampleTasks.length} aria-valuenow={done.length}>
                <span style={{ width: 100 * done.length / sampleTasks.length + "%" }} />
              </div>
              <ul className="tos-compact-list">
                {sampleTasks.map((task) => (
                  <li key={task} className="tos-task-row">
                    <button type="button" className="tos-check" aria-pressed={done.includes(task)}
                      aria-label={(done.includes(task) ? "Reopen " : "Complete ") + task}
                      onClick={() => setDone((old) => old.includes(task) ? old.filter((label) => label !== task) : [...old, task])}>
                      {done.includes(task) && <Icon name="check" className="size-4" />}
                    </button>
                    <span className={done.includes(task) ? "tos-muted line-through" : ""}>{task}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
        <section className="tos-start">
          <span className="tos-kind-icon" data-kind="class"><Icon name="sunrise" className="size-5" /></span>
          <div><h2>Make it yours</h2><p>Sign in to start with your own calendar and keep what you add.</p></div>
          <Link href="/signup" className="button-primary">Start my planner</Link>
        </section>
      </div>
      {selected && <PlannerDialog title={selected.title} caption={entryTime(selected)} onClose={() => setSelected(null)}>
        <p className="tos-muted">{dateLabel(selected.item_date, { weekday: "long", month: "long", day: "numeric" })}</p>
        {selected.location && <p className="mt-2 flex items-center gap-2 text-sm"><Icon name="location" className="size-4" />{selected.location}</p>}
      </PlannerDialog>}
      {editing && <PlannerDialog title="Add a sample event" caption="This only updates the example." onClose={() => setEditing(false)}>
        <form className="grid gap-4" onSubmit={addEvent}>
          <Field label="Title"><input className="control" name="title" required maxLength={100} placeholder="Coffee with a friend" /></Field>
          <Field label="Date"><input className="control" name="date" type="date" required defaultValue={activeDay} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time"><input className="control" name="start_time" type="time" required /></Field>
            <Field label="End time"><input className="control" name="end_time" type="time" required /></Field>
          </div>
          {error && <p className="feedback-error" role="alert">{error}</p>}
          <button className="button-primary justify-self-start">Add to example</button>
        </form>
      </PlannerDialog>}
    </main>
  );
}
