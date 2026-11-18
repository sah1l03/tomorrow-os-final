import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/planner/Icon";
import PersonalWorkspace from "@/components/planner/PersonalWorkspace";
import { LoadError, PageHeader } from "@/components/planner/ui";
import { getPlanner } from "@/lib/planner-data";
import type { EventItem } from "@/lib/planner";

export const metadata: Metadata = { title: "Personal" };

export default async function PersonalPage({ searchParams }: PageProps<"/personal">) {
  const [{ supabase, userId, now }, { view }] = await Promise.all([getPlanner(), searchParams]);
  const { data, error } = await supabase.from("events")
    .select("id, title, starts_at, ends_at, location, notes, visibility, repeat_until, repeat_every_weeks")
    .eq("owner_id", userId).eq("category", "personal").order("starts_at");

  return (
    <div className="workspace workspace-split">
      <PageHeader eyebrow="Your time" title="Personal" addTarget={error ? undefined : "add-personal-event"}
        description="Make time for the gym, appointments, study sessions, and plans outside class or work."
        action={<Link prefetch={false} className="button-secondary" href="/calendar"><Icon name="calendar" className="size-4" />Calendar</Link>} />
      {error ? <LoadError /> : <PersonalWorkspace key={view === "all" ? "all" : "upcoming"}
        events={(data ?? []) as EventItem[]} now={now} initialFilter={view === "all" ? "all" : "upcoming"} />}
    </div>
  );
}
