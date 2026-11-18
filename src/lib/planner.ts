import { Temporal } from "temporal-polyfill";

export const PLANNER_ZONE = "America/Halifax";
export const WEEKDAYS = [
  [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [0, "Sun"],
] as const;

export const VISIBILITIES = {
  private: "Private",
  busy: "Busy only",
  shared: "Shared details",
} as const;
export type Visibility = keyof typeof VISIBILITIES;

export const DEADLINE_KINDS = ["assignment", "lab", "quiz", "test", "exam", "other"] as const;
export const DEADLINE_STATUSES = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
} as const;
export const PRIORITIES = ["low", "normal", "high"] as const;
export type DeadlineKind = (typeof DEADLINE_KINDS)[number];
export type DeadlineStatus = keyof typeof DEADLINE_STATUSES;
export type Priority = (typeof PRIORITIES)[number];

export const CATEGORIES = {
  class: { label: "Class", color: "#5b43b5", background: "#eee8ff", href: "/courses", anchor: "meeting" },
  work: { label: "Work", color: "#0a6b59", background: "#def5eb", href: "/work", anchor: "shift" },
  deadline: { label: "Deadline", color: "#a2384e", background: "#fbe5ec", href: "/deadlines", anchor: "deadline" },
  personal: { label: "Personal", color: "#255c9b", background: "#e3efff", href: "/personal", anchor: "event" },
  task: { label: "Task", color: "#815309", background: "#fff1d4", href: "/tasks", anchor: "task" },
  busy: { label: "Busy", color: "#514c64", background: "#eae8f1", href: "/shared", anchor: "shared" },
} as const;
export type Category = keyof typeof CATEGORIES;
export const SHARE_CATEGORIES = ["class", "work", "deadline", "personal", "task"] as const;

export type Course = { id: string; code: string; name: string };
export type EventItem = {
  id: string; title: string; starts_at: string; ends_at: string;
  location: string; notes: string; visibility: Visibility;
  repeat_until: string | null; repeat_every_weeks: number;
};
export type MeetingValues = {
  label: string; weekdays: number[]; start_time: string; end_time: string;
  start_date: string; end_date: string; repeat_every_weeks: number;
  excluded_dates: string[]; location: string; notes: string;
};
export type ClassMeeting = MeetingValues & {
  id: string; course_id: string; visibility: Visibility;
  source_name: string; source_page: number | null;
};
export type Deadline = {
  id: string; course_id: string; title: string; kind: DeadlineKind;
  due_date: string; due_time: string | null; status: DeadlineStatus;
  visibility: Visibility; source_name: string; source_page: number | null;
};
export type WorkShift = {
  id: string; workplace: string; starts_at: string; ends_at: string;
  repeat_until: string | null; repeat_every_weeks: number;
  location: string; notes: string; visibility: Visibility;
};
export type Task = {
  id: string; title: string; due_date: string | null; due_time: string | null;
  priority: Priority; completed: boolean; visibility: Visibility;
};
export type CalendarShare = {
  id: string; owner_id: string; viewer_id: string | null; owner_label: string;
  viewer_label: string | null; scope: "all" | "selected";
  categories: Exclude<Category, "busy">[]; item_ids: string[];
};
export type CalendarScope = "mine" | "shared" | "all";
export type SharedCalendar = Pick<CalendarShare, "id" | "owner_id" | "owner_label">;
export type EventSuggestion = { shareId: string; eventId?: string; revision?: string };
export type ShareItem = { id: string; kind: Exclude<Category, "busy">; title: string; visibility: Visibility };
export type ScheduleEntry = {
  id: string; record_id: string | null; kind: Category; title: string;
  subtitle: string; item_date: string; starts_at: string | null; ends_at: string | null;
  location: string; notes: string; status: DeadlineStatus | null;
  visibility: Visibility; owner_label: string | null;
  share_id: string | null; shared_event_id: string | null; shared_event_revision: string | null;
  repeat_until: string | null; repeat_every_weeks: number | null;
  series_starts_at: string | null; series_ends_at: string | null;
};

export type CalendarActivity = {
  id: string; sender_id: string; recipient_id: string; body: string; created_at: string;
  status: "pending" | "approved" | "declined" | null;
  proposed_title: string | null; proposed_start: string | null; proposed_end: string | null;
  original_title: string | null; original_start: string | null; original_end: string | null;
};

export function todayDate() {
  return Temporal.Now.plainDateISO(PLANNER_ZONE).toString();
}

export function addDays(date: string, days: number) {
  return Temporal.PlainDate.from(date).add({ days }).toString();
}

export function mondayOf(date: string) {
  const day = Temporal.PlainDate.from(date);
  return day.subtract({ days: day.dayOfWeek - 1 }).toString();
}

export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) return false;
  try {
    return Temporal.PlainDate.from(value).toString() === value;
  } catch {
    return false;
  }
}

export function isTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function dateLabel(value: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-CA", { ...options, timeZone: "UTC" })
    .format(new Date(value + "T12:00:00Z"));
}

export function instantDate(value: string) {
  return Temporal.Instant.from(value).toZonedDateTimeISO(PLANNER_ZONE).toPlainDate().toString();
}

export function localInput(value: string) {
  return Temporal.Instant.from(value).toZonedDateTimeISO(PLANNER_ZONE)
    .toPlainDateTime().toString({ smallestUnit: "minute" });
}

export function wallInstant(date: string, time: string) {
  if (!isDate(date) || !isTime(time)) throw new Error("Choose a valid date and time.");
  const wall = Temporal.PlainDateTime.from(date + "T" + time);
  const zoned = wall.toZonedDateTime(PLANNER_ZONE);
  if (!wall.equals(zoned.toPlainDateTime())) {
    throw new Error("That time is skipped when the clocks change in Halifax. Choose another time.");
  }
  return zoned.toInstant().toString();
}

const halifaxClock = new Intl.DateTimeFormat("en-US", {
  timeZone: PLANNER_ZONE, hour: "numeric", minute: "2-digit", hour12: true,
});

export function clock(value: string) {
  return halifaxClock.format(new Date(value));
}

export function wallClock(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return String(hours % 12 || 12) + ":" + String(minutes).padStart(2, "0") + (hours >= 12 ? " PM" : " AM");
}

export function intervalLabel(start: string, end: string) {
  const a = instantDate(start);
  const b = instantDate(end);
  return a === b
    ? clock(start) + " – " + clock(end)
    : dateLabel(a) + ", " + clock(start) + " – " + dateLabel(b) + ", " + clock(end);
}

export function datedInterval(start: string, end: string) {
  const from = instantDate(start);
  const to = instantDate(end);
  const day = dateLabel(from, { weekday: "short", month: "short", day: "numeric" });
  return day + " · " + clock(start) + " – " + (from === to ? "" : dateLabel(to) + ", ") + clock(end);
}

export function entryTime(item: ScheduleEntry) {
  if (!item.starts_at) return "No time set";
  return item.ends_at ? intervalLabel(item.starts_at, item.ends_at) : clock(item.starts_at);
}

export function onDay(item: ScheduleEntry, date: string) {
  if (!item.starts_at || !item.ends_at) return item.item_date === date;
  const start = new Date(wallInstant(date, "00:00")).getTime();
  const end = new Date(wallInstant(addDays(date, 1), "00:00")).getTime();
  return new Date(item.starts_at).getTime() < end && new Date(item.ends_at).getTime() > start;
}

export function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function visibilityField(form: FormData): Visibility {
  const value = field(form, "visibility");
  return value === "busy" || value === "shared" ? value : "private";
}

export function readMeeting(form: FormData, prefix = ""): MeetingValues {
  const read = (name: string) => field(form, prefix + name);
  const label = read("label");
  const weekdays = [...new Set(form.getAll(prefix + "weekdays").map(Number))].sort();
  const start_time = read("start_time");
  const end_time = read("end_time");
  const start_date = read("start_date");
  const end_date = read("end_date");
  const repeat_every_weeks = Number(read("repeat_every_weeks"));
  const excluded_dates = [...new Set(read("excluded_dates").split(/[\s,]+/).filter(Boolean))].sort();

  if (!label || label.length > 120) throw new Error("Enter a meeting name up to 120 characters.");
  if (!weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new Error("Select at least one class day.");
  }
  if (!isTime(start_time) || !isTime(end_time) || end_time <= start_time) {
    throw new Error("Choose valid times. End time must be after start time.");
  }
  if (!isDate(start_date) || !isDate(end_date) || end_date < start_date) {
    throw new Error("Choose valid first and last dates.");
  }
  if (repeat_every_weeks !== 1 && repeat_every_weeks !== 2) {
    throw new Error("Choose how often the meeting repeats.");
  }
  if (repeat_every_weeks === 2) {
    const firstDay = Temporal.PlainDate.from(start_date).dayOfWeek % 7;
    if (weekdays.length !== 1 || weekdays[0] !== firstDay) {
      throw new Error("For every other week, choose one weekday and set the start date to the first actual meeting.");
    }
  }
  if (excluded_dates.some((date) => !isDate(date) || date < start_date || date > end_date)) {
    throw new Error("Skipped dates must be YYYY-MM-DD and fall inside the meeting date range.");
  }
  return {
    label, weekdays, start_time, end_time, start_date, end_date, repeat_every_weeks,
    excluded_dates, location: read("location"), notes: read("notes"),
  };
}

export function validateDue(date: string, time: string, required: boolean) {
  if ((date || required) && !isDate(date)) throw new Error("Choose a valid due date.");
  if (time && (!date || !isTime(time))) throw new Error("Choose a valid date and time, or leave the time blank.");
  if (time) wallInstant(date, time);
}
