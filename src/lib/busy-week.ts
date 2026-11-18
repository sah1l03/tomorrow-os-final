import { addDays, clock, dateLabel, wallInstant, type ScheduleEntry } from "@/lib/planner";

type BusyBlock = { start: number; end: number };
export type BusyDay = { date: string; blocks: BusyBlock[] };

export function busyWeek(entries: ScheduleEntry[], week: string): BusyDay[] {
  const timed = entries
    .flatMap(({ visibility, owner_label, share_id, kind, starts_at, ends_at }) => {
      if ((visibility !== "busy" && visibility !== "shared") || owner_label || share_id ||
          (kind !== "class" && kind !== "work" && kind !== "personal") || !starts_at || !ends_at) return [];
      return [{ start: Date.parse(starts_at), end: Date.parse(ends_at) }];
    })
    .filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((a, b) => a.start - b.start);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(week, index);
    const first = Date.parse(wallInstant(date, "00:00"));
    const last = Date.parse(wallInstant(addDays(date, 1), "00:00"));
    const blocks: BusyBlock[] = [];
    for (const { start, end } of timed) {
      if (start >= last) break;
      if (end <= first) continue;
      const block = { start: Math.max(start, first), end: Math.min(end, last) };
      const previous = blocks.at(-1);
      if (previous && previous.end >= block.start) previous.end = Math.max(previous.end, block.end);
      else blocks.push(block);
    }
    return { date, blocks };
  });
}

export function busyLabel(block: BusyBlock, date: string) {
  const midnight = block.end === Date.parse(wallInstant(addDays(date, 1), "00:00"));
  return clock(new Date(block.start).toISOString()) + " – " + (midnight ? "midnight" : clock(new Date(block.end).toISOString()));
}

export function busyText(days: BusyDay[]) {
  return [
    "Busy times · " + dateLabel(days[0].date) + " – " + dateLabel(days[6].date),
    "Time zone: America/Halifax",
    ...days.flatMap(({ date, blocks }) => blocks.length ? [
      "", dateLabel(date, { weekday: "long", month: "short", day: "numeric" }),
      ...blocks.map((block) => busyLabel(block, date)),
    ] : []),
  ].join("\n");
}

function calendarDate(epoch: number) {
  return new Date(epoch).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function busyCalendar(days: BusyDay[], created = Date.now()) {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TomorrowOS//Busy times//EN", "CALSCALE:GREGORIAN",
    ...days.flatMap(({ blocks }) => blocks.flatMap(({ start, end }) => [
      "BEGIN:VEVENT", "UID:" + crypto.randomUUID() + "@tomorrowos",
      "DTSTAMP:" + calendarDate(created), "DTSTART:" + calendarDate(start), "DTEND:" + calendarDate(end),
      "SUMMARY:Busy", "CLASS:PRIVATE", "TRANSP:OPAQUE", "END:VEVENT",
    ])),
    "END:VCALENDAR", "",
  ].join("\r\n");
}
