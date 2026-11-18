import Link from "next/link";
import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/planner/Icon";
import { CATEGORIES, addDays, clock, dateLabel, entryTime, instantDate, onDay, type Category, type ScheduleEntry } from "@/lib/planner";

const icons: Record<Category, IconName> = {
  class: "courses", deadline: "flag", work: "work", personal: "personal", task: "tasks", busy: "lock",
};

export function ScheduleIcon({ kind }: { kind: Category }) {
  return <span className="tos-kind-icon" data-kind={kind}><Icon name={icons[kind]} className="size-[1.15rem]" /></span>;
}

export function Card({ title, kicker, subtitle, action, footer, children }: {
  title: string; kicker?: string; subtitle?: string; action?: ReactNode; footer?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="tos-card">
      <header className="tos-card-header">
        <div className="min-w-0">
          {kicker && <p className="tos-kicker">{kicker}</p>}
          <h2>{title}</h2>
          {subtitle && <p className="tos-muted">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
      {footer && <footer className="tos-card-footer">{footer}</footer>}
    </section>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} prefetch={false} className="tos-text-link">{children}<Icon name="arrow" className="size-4" /></Link>;
}

export function FocusCard({ entry, today, now, unavailable, children }: {
  entry: ScheduleEntry | null; today: string; now: string; unavailable?: boolean; children: ReactNode;
}) {
  const live = entry?.starts_at && entry.ends_at && Date.parse(entry.starts_at) <= Date.parse(now) && Date.parse(entry.ends_at) > Date.parse(now);
  const date = entry ? (entry.starts_at ? instantDate(entry.starts_at) : entry.item_date) : today;
  const scheduleLabel = live ? "Happening now" : "Up next";
  return (
    <section className="tos-focus dashboard-reveal" aria-label="Next on your schedule">
      <div className="tos-focus-art" aria-hidden="true" />
      <div className="tos-focus-copy">
        <p className="tos-focus-kicker"><span />{entry ? scheduleLabel : "Your planner"}</p>
        <h2>{entry?.title ?? (unavailable ? "Your schedule is unavailable" : "A little room to plan")}</h2>
        {entry ? (
          <div className="tos-focus-meta">
            <span><Icon name="deadlines" className="size-4" />
              {!live && date !== today && dateLabel(date, { weekday: "short", month: "short", day: "numeric" }) + " · "}
              {entry.starts_at ? entryTime(entry) : "Due today"}
            </span>
            {entry.location && <span><Icon name="location" className="size-4" />{entry.location}</span>}
          </div>
        ) : <p className="tos-focus-meta">{unavailable ? "Check your connection and refresh to see your plans." : "See what’s coming up or add something to your calendar."}</p>}
        <div className="tos-focus-actions">{children}</div>
      </div>
    </section>
  );
}

export function entryLink(item: ScheduleEntry) {
  const category = CATEGORIES[item.kind];
  if (!item.record_id) return "/calendar?view=day&date=" + item.item_date;
  return category.href + (item.kind === "personal" ? "?view=all" : "") + "#" + category.anchor + "-" + item.record_id;
}

export function Timeline({ entries, today, onSelect }: {
  entries: ScheduleEntry[]; today: string; onSelect?: (entry: ScheduleEntry) => void;
}) {
  return (
    <ul className="tos-timeline">
      {entries.map((entry) => {
        const time = entry.starts_at && instantDate(entry.starts_at) !== today ? "Overnight"
          : entry.starts_at ? clock(entry.starts_at).replace(":00 ", " ") : "Untimed";
        const subtitle = [CATEGORIES[entry.kind].label, entry.subtitle, entry.location].filter(Boolean).join(" · ");
        const row = <>
          <span className="tos-timeline-time">{time}</span>
          <ScheduleIcon kind={entry.kind} />
          <span className="tos-timeline-copy"><strong>{entry.title}</strong><small>{subtitle}</small></span>
          <Icon name={entry.status === "completed" ? "check" : "right"} className="size-4 tos-muted" />
        </>;
        const className = "tos-timeline-row" + (entry.status === "completed" ? " is-complete" : "");
        return <li key={entry.id}>{onSelect
          ? <button type="button" className={className} onClick={() => onSelect(entry)}>{row}</button>
          : <Link prefetch={false} className={className} href={entryLink(entry)}>{row}</Link>}
        </li>;
      })}
    </ul>
  );
}

export function WeekStrip({ week, today, entries, activeDay, onDayChange }: {
  week: string; today: string; entries: ScheduleEntry[]; activeDay?: string; onDayChange?: (date: string) => void;
}) {
  return (
    <div className="tos-week">
      {Array.from({ length: 7 }, (_, index) => {
        const date = addDays(week, index);
        const items = entries.filter((entry) => onDay(entry, date));
        const kinds = [...new Set(items.map((entry) => entry.kind))].slice(0, 4);
        const label = dateLabel(date, { weekday: "long", month: "long", day: "numeric" }) + ", " + items.length + (items.length === 1 ? " item" : " items");
        const children = <>
          <span>{dateLabel(date, { weekday: "short" }).slice(0, 2)}</span>
          <strong>{Number(date.slice(-2))}</strong>
          <span className="tos-week-dots" aria-hidden="true">{kinds.map((kind) => <i key={kind} data-kind={kind} />)}</span>
        </>;
        return onDayChange ? (
          <button key={date} type="button" className="tos-week-day" aria-label={label} aria-pressed={date === activeDay}
            onClick={() => onDayChange(date)}>{children}</button>
        ) : (
          <Link key={date} href={"/calendar?view=day&date=" + date} prefetch={false} className="tos-week-day"
            aria-label={label} aria-current={date === today ? "date" : undefined}>{children}</Link>
        );
      })}
    </div>
  );
}
