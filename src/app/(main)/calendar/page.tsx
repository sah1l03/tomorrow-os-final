import type { Metadata } from "next";
import ScheduleCalendar, { type CalendarView } from "@/components/calendar/ScheduleCalendar";
import { getPlanner } from "@/lib/planner-data";
import { isDate, todayDate, type CalendarScope, type SharedCalendar } from "@/lib/planner";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const [{ date, view, shared, scope, friend }, { supabase, userId }] = await Promise.all([searchParams, getPlanner()]);
  const { data, error } = await supabase.from("calendar_shares").select("id, owner_id, owner_label")
    .eq("viewer_id", userId).order("owner_label");
  const calendars = (data ?? []) as SharedCalendar[];
  const initialDate = typeof date === "string" && isDate(date) ? date : todayDate();
  const initialView: CalendarView = view === "day" ? "timeGridDay" : view === "agenda" ? "listWeek" :
    view === "month" ? "dayGridMonth" : "timeGridWeek";
  const initialFriend = calendars.find((calendar) => calendar.id === friend)?.id ?? "";
  const sharingError = !!error || (!!friend && !initialFriend);
  const initialScope: CalendarScope = sharingError ? "mine" : scope === "shared" ? "shared" :
    scope === "all" || shared === "1" ? "all" : "mine";

  return <ScheduleCalendar key={[initialDate, view, initialView, initialScope, initialFriend].join(":")}
    initialDate={initialDate} initialView={initialView} initialScope={initialScope} initialFriend={initialFriend}
    adaptiveView={view === undefined} calendars={calendars} sharingError={sharingError} />;
}
