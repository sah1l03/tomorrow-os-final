import Link from "next/link";
import type { Metadata } from "next";
import BusyExport from "@/components/daybreak/BusyExport";
import { Card, TextLink } from "@/components/daybreak/TodayCards";
import Icon from "@/components/planner/Icon";
import { LoadError, PageHeader } from "@/components/planner/ui";
import { busyLabel, busyWeek } from "@/lib/busy-week";
import { addDays, dateLabel, isDate, mondayOf, todayDate } from "@/lib/planner";
import { loadSchedule } from "@/lib/planner-data";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage({ searchParams }: PageProps<"/availability">) {
  const { date } = await searchParams;
  const current = mondayOf(todayDate());
  const requested = typeof date === "string" && isDate(date) ? mondayOf(date) : current;
  const week = isDate(requested) && isDate(addDays(requested, 7)) ? requested : current;
  const { entries, error } = await loadSchedule(week, addDays(week, 7));
  const days = busyWeek(entries, week);
  const booked = days.filter(({ blocks }) => blocks.length);
  const previous = addDays(week, -7);
  const following = addDays(week, 7);

  return (
    <div className="workspace">
      <PageHeader eyebrow="Plan together" title="Availability" description="Send a week of busy times to someone who uses another calendar." />
      <div className="tos-availability-layout">
        <Card title={dateLabel(week) + " – " + dateLabel(addDays(week, 6))} kicker="Weekly preview" subtitle="America/Halifax"
          action={<div className="flex flex-wrap gap-2">
            {isDate(previous) && <Link prefetch={false} href={"/availability?date=" + previous} className="button-secondary tos-small-button" aria-label="Previous week"><Icon name="left" className="size-4" /></Link>}
            {week !== current && <Link prefetch={false} href="/availability" className="button-secondary tos-small-button">This week</Link>}
            {isDate(addDays(following, 7)) && <Link prefetch={false} href={"/availability?date=" + following} className="button-secondary tos-small-button" aria-label="Next week"><Icon name="right" className="size-4" /></Link>}
          </div>}>
          {error ? <div className="tos-card-body"><LoadError /></div> : booked.length ? (
            <ul className="tos-compact-list">
              {booked.map(({ date, blocks }) => (
                <li className="tos-busy-day" key={date}>
                  <strong>{dateLabel(date, { weekday: "long", month: "short", day: "numeric" })}</strong>
                  <div className="flex flex-wrap gap-2">
                    {blocks.map((block) => <span className="tos-busy-slot" key={block.start}>{busyLabel(block, date)}</span>)}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="tos-empty">No shareable busy times this week. Mark a class, shift, or personal event as Busy only or Shared details to include it.</p>}
        </Card>
        <Card title="Share busy times" kicker="Privacy first" footer={<TextLink href="/shared">Roommate calendars</TextLink>}>
          <div className="tos-card-body grid gap-3">
            <p className="tos-muted">The export includes your timed items marked Busy only or Shared details. Each block is labeled Busy and includes only its start and end times.</p>
            {!error && <BusyExport key={week} days={days} />}
          </div>
        </Card>
      </div>
    </div>
  );
}
