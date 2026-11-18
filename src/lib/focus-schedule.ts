import { onDay, type ScheduleEntry } from "@/lib/planner";

export function nextEntry(entries: ScheduleEntry[], today: string, now: string) {
  const upcoming = entries.filter((entry) => entry.status !== "completed" && entry.kind !== "task");
  const time = Date.parse(now);
  const timed = upcoming.filter((entry) => entry.starts_at &&
    (entry.ends_at ? Date.parse(entry.ends_at) > time : Date.parse(entry.starts_at) >= time));
  const todayTimed = timed.find((entry) => onDay(entry, today));
  return todayTimed ?? upcoming.find((entry) => !entry.starts_at && entry.item_date === today)
    ?? timed[0] ?? null;
}
