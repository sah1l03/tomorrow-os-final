import { Temporal } from "temporal-polyfill";
import { dateLabel, PLANNER_ZONE, type EventItem } from "@/lib/planner";

export type PersonalTiming = Pick<EventItem, "starts_at" | "ends_at" | "repeat_until" | "repeat_every_weeks">;

export function repeatLabel(until: string, weeks: number) {
  return (weeks === 2 ? "Every other week" : "Weekly") + " through " + dateLabel(until, { month: "short", day: "numeric", year: "numeric" });
}

/** Display the next or ongoing occurrence, or the final one for a past series. */
export function personalInterval(event: PersonalTiming, now: string) {
  if (!event.repeat_until) return { start: event.starts_at, end: event.ends_at };
  const start = Temporal.Instant.from(event.starts_at).toZonedDateTimeISO(PLANNER_ZONE).toPlainDateTime();
  const end = Temporal.Instant.from(event.ends_at).toZonedDateTimeISO(PLANNER_ZONE).toPlainDateTime();
  const today = Temporal.Instant.from(now).toZonedDateTimeISO(PLANNER_ZONE).toPlainDate();
  const lastDay = Temporal.PlainDate.from(event.repeat_until);
  const step = 7 * event.repeat_every_weeks;
  const last = Math.max(0, Math.floor(start.toPlainDate().until(lastDay).days / step));
  const first = Math.min(last, Math.max(0, Math.ceil(end.toPlainDate().until(today).days / step)));

  function at(index: number) {
    if (index === 0) return { start: event.starts_at, end: event.ends_at };
    const offset = { days: index * step };
    // Match the calendar's PostgreSQL time-zone conversion when clocks change.
    const from = start.add(offset).toZonedDateTime(PLANNER_ZONE, { disambiguation: "later" }).toInstant();
    const to = end.add(offset).toZonedDateTime(PLANNER_ZONE, { disambiguation: "later" }).toInstant();
    return {
      start: from.toString(),
      end: to.epochMilliseconds > from.epochMilliseconds ? to.toString() : from.add({
        milliseconds: Date.parse(event.ends_at) - Date.parse(event.starts_at),
      }).toString(),
    };
  }

  const interval = at(first);
  return first < last && Date.parse(interval.end) < Date.parse(now) ? at(first + 1) : interval;
}
