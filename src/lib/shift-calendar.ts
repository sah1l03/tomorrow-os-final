import ICAL from "ical.js";
import { Temporal } from "temporal-polyfill";
import { PLANNER_ZONE } from "./planner";

export const MAX_CALENDAR_BYTES = 1024 * 1024;

export type CalendarShift = {
  calendar_uid: string;
  workplace: string;
  starts_at: string;
  ends_at: string;
  location: string;
};

function eventInstant(time: ICAL.Time, tzid?: string) {
  if (time.zone !== ICAL.Timezone.localTimezone) return time.toJSDate().toISOString();
  const plain = Temporal.PlainDateTime.from({
    year: time.year, month: time.month, day: time.day,
    hour: time.hour, minute: time.minute, second: time.second,
  });
  const zoned = plain.toZonedDateTime(tzid || PLANNER_ZONE);
  if (!zoned.toPlainDateTime().equals(plain)) throw new Error("Invalid local time");
  return zoned.toInstant().toString();
}

export function readShiftCalendar(text: string) {
  let calendar: ICAL.Component;
  try {
    calendar = new ICAL.Component(ICAL.parse(text.replace(/^\uFEFF/, "")));
  } catch {
    throw new Error("Choose a valid .ics calendar file.");
  }
  if (calendar.name !== "vcalendar") throw new Error("Choose a valid .ics calendar file.");

  const rows = calendar.getAllSubcomponents("vevent");
  if (rows.length > 200) throw new Error("Use a calendar export with at most 200 entries.");

  const shifts: CalendarShift[] = [];
  let skipped = 0;
  const seen = new Set<string>();

  for (const row of rows) {
    try {
      const event = new ICAL.Event(row);
      const startProp = row.getFirstProperty("dtstart");
      const endProp = row.getFirstProperty("dtend");
      const startTz = startProp?.getParameter("tzid");
      const endTz = endProp ? endProp.getParameter("tzid") : startTz;
      if (
        !startProp || !event.uid || event.uid.length > 512 || !event.summary?.trim()
        || event.isRecurring() || event.isRecurrenceException()
        || row.getFirstPropertyValue("status") === "CANCELLED"
        || event.startDate.isDate || event.endDate.isDate || seen.has(event.uid)
      ) {
        skipped++;
        continue;
      }

      const starts_at = eventInstant(event.startDate, typeof startTz === "string" ? startTz : undefined);
      const ends_at = eventInstant(event.endDate, typeof endTz === "string" ? endTz : undefined);
      const duration = Date.parse(ends_at) - Date.parse(starts_at);
      if (!Number.isFinite(duration) || duration <= 0 || duration > 25 * 3600 * 1000) {
        skipped++;
        continue;
      }
      shifts.push({
        calendar_uid: event.uid, workplace: event.summary.trim().slice(0, 200),
        starts_at, ends_at, location: (event.location ?? "").trim().slice(0, 200),
      });
      seen.add(event.uid);
    } catch {
      skipped++;
    }
  }

  return { shifts, skipped };
}
