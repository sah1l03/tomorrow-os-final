"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ClassMeetingForm from "@/components/forms/ClassMeetingForm";
import EventForm from "@/components/forms/EventForm";
import { DeadlineForm } from "@/components/planner/DeadlinesWorkspace";
import Icon from "@/components/planner/Icon";
import PlannerDialog from "@/components/planner/PlannerDialog";
import { TaskForm } from "@/components/planner/TasksWorkspace";
import { ShiftForm } from "@/components/planner/WorkWorkspace";
import { ScheduleIcon } from "./TodayCards";
import type { Course } from "@/lib/planner";

const choices = [
  ["personal", "Personal"], ["class", "Class"], ["deadline", "Deadline"],
  ["work", "Shift"], ["task", "Task"],
] as const;
type Kind = (typeof choices)[number][0];

export default function QuickAdd({ courses, coursesUnavailable, today }: {
  courses: Course[]; coursesUnavailable: boolean; today: string;
}) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 3500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  function finish() {
    setKind(null);
    setSaved(true);
  }

  return (
    <>
      <button type="button" className="button-primary tos-quick-add" onClick={() => { setSaved(false); setKind("personal"); }}>
        <Icon name="plus" className="size-4" /> Add item
      </button>
      {saved && <p className="tos-saved-toast" role="status"><Icon name="check" className="size-4" /> Added to TomorrowOS</p>}
      {kind && (
        <PlannerDialog title="Add to your planner" caption="Choose an item type to get started." onClose={() => setKind(null)}>
          <fieldset className="tos-kind-picker">
            <legend className="sr-only">Item type</legend>
            {choices.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={value === kind} onClick={() => setKind(value)}>
                <ScheduleIcon kind={value} />{label}
              </button>
            ))}
          </fieldset>
          {(kind === "class" || kind === "deadline") && !courses.length ? (
            <div className="tos-add-course">
              <p>{coursesUnavailable ? "Couldn’t load your courses." : "Classes and deadlines belong to a course."}</p>
              <div className="flex flex-wrap gap-2">
                <Link prefetch={false} href="/courses#add-course" className="button-primary">Open courses</Link>
                <Link prefetch={false} href="/import" className="button-secondary">Import syllabus</Link>
              </div>
            </div>
          ) : kind === "class" ? <ClassMeetingForm courses={courses} onSaved={finish} />
            : kind === "deadline" ? <DeadlineForm courses={courses} draftDate={today} onSaved={finish} />
            : kind === "work" ? <ShiftForm draftDate={today} onSaved={finish} />
            : kind === "task" ? <TaskForm onSaved={finish} />
            : <EventForm draft={{ date: today }} onSaved={finish} />}
        </PlannerDialog>
      )}
    </>
  );
}
