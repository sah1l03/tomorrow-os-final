import Link from "next/link";
import type { Metadata } from "next";
import ContourField from "@/components/layout/ContourField";
import QuickAdd from "@/components/daybreak/QuickAdd";
import { Card, FocusCard, TextLink, Timeline, WeekStrip, entryLink } from "@/components/daybreak/TodayCards";
import Icon from "@/components/planner/Icon";
import TaskToggle from "@/components/planner/TaskToggle";
import { LoadError, PageHeader } from "@/components/planner/ui";
import SceneWindow from "@/components/scenes/SceneWindow";
import { nextEntry } from "@/lib/focus-schedule";
import { getPlanner, loadCourses, loadSchedule } from "@/lib/planner-data";
import { addDays, dateLabel, datedInterval, instantDate, mondayOf, onDay, wallClock, type Deadline, type Task } from "@/lib/planner";

export const metadata: Metadata = { title: "Today" };

export default async function DashboardPage() {
  const { supabase, userId, now } = await getPlanner();
  const today = instantDate(now);
  const week = mondayOf(today);
  const horizon = addDays(today, 14);
  const [schedule, deadlineQuery, taskQuery, courses] = await Promise.all([
    loadSchedule(week, horizon),
    supabase.from("deadlines").select("id, course_id, title, due_date, due_time")
      .eq("owner_id", userId).neq("status", "completed").gte("due_date", today)
      .order("due_date").order("due_time", { nullsFirst: false }).limit(5),
    supabase.from("tasks").select("id, title, due_date, due_time, priority, completed", { count: "exact" })
      .eq("owner_id", userId).eq("completed", false)
      .order("due_date", { nullsFirst: false }).order("due_time", { nullsFirst: false }).limit(5),
    loadCourses(),
  ]);
  const deadlines = (deadlineQuery.data ?? []) as Pick<Deadline, "id" | "course_id" | "title" | "due_date" | "due_time">[];
  const tasks = (taskQuery.data ?? []) as Pick<Task, "id" | "title" | "due_date" | "due_time" | "priority" | "completed">[];
  const daily = schedule.entries.filter((entry) => onDay(entry, today));
  const next = nextEntry(schedule.entries, today, now);
  const work = schedule.entries.filter((entry) => entry.kind === "work" && entry.ends_at && Date.parse(entry.ends_at) > Date.parse(now));
  const startHere = !schedule.error && !taskQuery.error && !deadlineQuery.error && !courses.error &&
    !schedule.entries.length && !tasks.length && !deadlines.length && !courses.courses.length;
  const agenda = "/calendar?view=agenda&date=" + today;

  return (
    <div className="workspace dashboard-workspace tos-today">
      <PageHeader
        eyebrow="Your workspace"
        title="Today"
        action={<QuickAdd courses={courses.courses} coursesUnavailable={!!courses.error} today={today} />}
      />
      <p className="tos-today-date"><Icon name="sunrise" className="size-4" />
        <time dateTime={today}>{dateLabel(today, { weekday: "long", month: "long", day: "numeric" })}</time>
        <span>Halifax time</span>
      </p>
      <FocusCard entry={next} today={today} now={now} unavailable={!!schedule.error}>
        <Link prefetch={false} className="tos-hero-link" href={next ? entryLink(next) : agenda}>
          {next ? "View details" : "Open calendar"}<Icon name="arrow" className="size-4" />
        </Link>
        <Link prefetch={false} className="tos-hero-link quiet" href="/import">
          <Icon name="import" className="size-4" />Import syllabus
        </Link>
      </FocusCard>

      {startHere && (
        <section className="tos-start">
          <span className="tos-kind-icon" data-kind="class"><Icon name="sunrise" className="size-5" /></span>
          <div><h2>Set up your first week</h2>
            <p>Import a syllabus to fill in classes and deadlines, or use Add item to plan one thing at a time.</p></div>
          <TextLink href="/example">Explore an example</TextLink>
        </section>
      )}

      <div className="tos-today-columns">
        <div className="tos-today-stack">
          <Card title="Today’s timeline" kicker="Your schedule"
            action={!schedule.error && <span className="tos-count">{daily.length} {daily.length === 1 ? "item" : "items"}</span>}
            footer={<><span className="tos-muted">All times in Halifax</span><TextLink href={agenda}>View agenda</TextLink></>}>
            {schedule.error ? <div className="tos-card-body"><LoadError /></div> : daily.length
              ? <Timeline entries={daily} today={today} />
              : <p className="tos-empty">Nothing on your calendar today. Add a class, shift, deadline, or personal event whenever you’re ready.</p>}
          </Card>
          <Card title="Upcoming deadlines" kicker="Academics" footer={<TextLink href="/deadlines">All deadlines</TextLink>}>
            {deadlineQuery.error ? <div className="tos-card-body"><LoadError /></div> : deadlines.length ? (
              <ul className="tos-compact-list">
                {deadlines.map((deadline) => (
                  <li key={deadline.id}>
                    <Link href={"/deadlines#deadline-" + deadline.id} prefetch={false} className="tos-compact-row">
                      <span className="tos-row-copy"><strong>{deadline.title}</strong>
                        <small>{courses.courses.find((course) => course.id === deadline.course_id)?.code || "Course deadline"}</small></span>
                      <span className="tos-due-label">{deadline.due_date === today ? "Today" : dateLabel(deadline.due_date)}
                        {deadline.due_time && <small>{wallClock(deadline.due_time)}</small>}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="tos-empty">You have no upcoming deadlines.</p>}
          </Card>
        </div>

        <div className="tos-today-stack">
          <Card title="This week" subtitle={dateLabel(week) + " – " + dateLabel(addDays(week, 6))}
            action={<TextLink href={"/calendar?view=week&date=" + today}>Week view</TextLink>}>
            {schedule.error ? <div className="tos-card-body"><LoadError /></div> : <WeekStrip week={week} today={today} entries={schedule.entries} />}
          </Card>
          <Card title="Quick tasks" subtitle={taskQuery.count == null ? undefined : taskQuery.count + " open"}
            footer={<TextLink href="/tasks">All tasks</TextLink>}>
            {taskQuery.error ? <div className="tos-card-body"><LoadError /></div> : tasks.length ? (
              <ul className="tos-compact-list">
                {tasks.map((task) => (
                  <li key={task.id} className="tos-task-row">
                    <TaskToggle task={task} compact />
                    <Link href={"/tasks#task-" + task.id} prefetch={false} className="tos-row-copy">
                      <strong>{task.title}</strong>
                      {(task.due_date || task.priority === "high") && <small>
                        {[task.due_date ? dateLabel(task.due_date) : "", task.due_time ? wallClock(task.due_time) : "", task.priority === "high" ? "High priority" : ""].filter(Boolean).join(" · ")}
                      </small>}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="tos-empty">You’re caught up on tasks.</p>}
          </Card>
          <Card title="Upcoming shifts" subtitle="Next 14 days" footer={<TextLink href="/work">All shifts</TextLink>}>
            {schedule.error ? <div className="tos-card-body"><LoadError /></div> : work.length ? (
              <ul className="tos-compact-list">
                {work.slice(0, 3).map((entry) => (
                  <li key={entry.id}>
                    <Link prefetch={false} href={entryLink(entry)} className="tos-compact-row">
                      <span className="tos-row-copy"><strong>{entry.title}</strong>
                        <small>{entry.starts_at && entry.ends_at && datedInterval(entry.starts_at, entry.ends_at)}</small></span>
                      <Icon name="right" className="size-4 tos-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="tos-empty">No shifts in this window.</p>}
          </Card>
        </div>
      </div>

      <details className="tos-scene">
        <summary><Icon name="motion" className="size-5" /><span>Interactive scene<small>Cat, ocean, or space</small></span><Icon name="expand" className="size-4" /></summary>
        <SceneWindow placement="dashboard" />
      </details>
      <ContourField variant="dashboard" />
    </div>
  );
}
