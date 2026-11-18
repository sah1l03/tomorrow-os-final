"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import MeetingFields from "@/components/forms/MeetingFields";
import DueFields from "@/components/forms/DueFields";
import { EmptyState, Field, LoadError, Panel } from "@/components/planner/ui";
import { createClient } from "@/lib/supabase/client";
import { DEADLINE_KINDS, field, isDate, readMeeting, validateDue, type Course, type DeadlineKind } from "@/lib/planner";
import type { SyllabusPreview } from "@/lib/syllabus-preview";

type ImportResult = {
  course_id: string;
  meetings_added: number;
  deadlines_added: number;
  duplicates: number;
};

function sourceLabel(page: number | null) {
  return page ? "PDF page " + page : "Source page unknown";
}

export default function SyllabusReview({ preview, fileName, courses }: {
  preview: SyllabusPreview; fileName: string; courses: Course[];
}) {
  const router = useRouter();
  const matches = courses.filter((course) => course.code.toUpperCase() === preview.course_code?.trim().toUpperCase());
  const [course, setCourse] = useState(matches.length === 1 ? matches[0].id : "");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working || result) return;
    setError("");
    const fields = new FormData(event.currentTarget);

    try {
      const code = field(fields, "course_code");
      const name = field(fields, "course_name");
      if (!course && (!code || !name)) throw new Error("Enter a course code and name.");
      if (course && !courses.some((item) => item.id === course)) throw new Error("Choose one of your courses.");

      const meetings = preview.meetings.flatMap((meeting, index) => {
        const prefix = "meeting_" + index + "_";
        if (!fields.has(prefix + "include")) return [];
        try {
          return [{ ...readMeeting(fields, prefix), source_page: meeting.source_page }];
        } catch (error) {
          throw new Error("Meeting " + (index + 1) + ": " + (error instanceof Error ? error.message : "Check its details."));
        }
      });
      const deadlines = preview.deadlines.flatMap((deadline, index) => {
        const prefix = "deadline_" + index + "_";
        if (!fields.has(prefix + "include")) return [];
        const title = field(fields, prefix + "title");
        const kind = field(fields, prefix + "kind") as DeadlineKind;
        const due_date = field(fields, prefix + "due_date");
        const due_time = field(fields, prefix + "due_time");
        try {
          if (!title || title.length > 200 || !DEADLINE_KINDS.includes(kind)) throw new Error("Enter a title and choose a type.");
          validateDue(due_date, due_time, true);
        } catch (error) {
          throw new Error("Deadline " + (index + 1) + ": " + (error instanceof Error ? error.message : "Check its details."));
        }
        return [{ title, kind, due_date, due_time: due_time || null, source_page: deadline.source_page }];
      });

      if (course && !meetings.length && !deadlines.length) throw new Error("Select at least one meeting or deadline to add.");
      if (meetings.length > 50 || deadlines.length > 200) throw new Error("Select up to 50 meetings and 200 deadlines at once.");

      setWorking(true);
      const { data, error } = await createClient().rpc("save_syllabus_import", {
        p_course_id: course || null, p_course_code: code, p_course_name: name,
        p_source_name: fileName, p_meetings: meetings, p_deadlines: deadlines,
      });
      if (error || !data) {
        setError(error?.code === "P0001" || error?.code?.startsWith("23") || error?.code?.startsWith("22")
          ? "Could not save the import. Check the dates and fields, then try again."
          : "Could not confirm the save. Check your Courses page before retrying.");
        return;
      }
      setResult(data as ImportResult);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save the import.");
    } finally {
      setWorking(false);
    }
  }

  if (result) return (
    <Panel title="Syllabus saved" caption="Your reviewed items are in TomorrowOS.">
      <p className="feedback-ok" role="status">
        {result.meetings_added} {result.meetings_added === 1 ? "meeting" : "meetings"} and{" "}
        {result.deadlines_added} {result.deadlines_added === 1 ? "deadline" : "deadlines"} added.
        {result.duplicates > 0 && " " + result.duplicates + " matching items were already saved."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link prefetch={false} className="button-primary" href="/calendar">Open calendar</Link>
        <Link prefetch={false} className="button-secondary" href={"/courses#course-" + result.course_id}>View course</Link>
        <Link prefetch={false} className="button-secondary" href="/deadlines">View deadlines</Link>
      </div>
    </Panel>
  );

  return (
    <form onSubmit={submit} className="min-w-0 space-y-5">
      <fieldset disabled={working} className="min-w-0 space-y-5">
        <Panel title="Review your draft" caption="Check against the PDF. You choose what goes on your schedule. Times use Halifax time.">
          <p className="mb-4 break-words text-xs font-semibold text-brand-800">{fileName}</p>
          <div className="space-y-4">
            <Field label="Save to">
              <select className="control" value={course} onChange={(event) => setCourse(event.target.value)}>
                <option value="">Create a new course</option>
                {courses.map(({ id, code, name }) => <option key={id} value={id}>{code} · {name}</option>)}
              </select>
            </Field>
            {!course && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Course code"><input className="control" name="course_code" defaultValue={preview.course_code ?? ""} required maxLength={30} /></Field>
                <Field label="Course name"><input className="control" name="course_name" defaultValue={preview.course_name ?? ""} required maxLength={200} /></Field>
              </div>
            )}
            {!!course && <p className="text-xs leading-5 text-slate-600">Matching items already in this course will be skipped.</p>}
          </div>
        </Panel>

        {preview.questions.length > 0 && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
            <h2 className="text-sm font-semibold">Check these against the syllabus</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
              {preview.questions.map((question, index) => <li key={index}>{question}</li>)}
            </ul>
          </section>
        )}

        <Panel title={"Class meetings · " + preview.meetings.length}
          caption="Select only the lecture, lab, or tutorial sections you attend. Fill any missing fields for selected meetings.">
          {!preview.meetings.length && <EmptyState>No class meetings found.</EmptyState>}
          <div className="space-y-3">
            {preview.meetings.map((meeting, index) => {
              const prefix = "meeting_" + index + "_";
              return (
                <article className="record" key={index}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input name={prefix + "include"} className="accent-brand-700" type="checkbox" />
                      Include meeting {index + 1}
                    </label>
                    <span className="text-xs text-slate-600">{sourceLabel(meeting.source_page)}</span>
                  </div>
                  <MeetingFields initial={meeting} prefix={prefix} required={false} />
                </article>
              );
            })}
          </div>
        </Panel>

        <Panel title={"Deadlines · " + preview.deadlines.length} caption="Select deadlines you want to keep. A due date is required; an unknown time can stay blank.">
          {!preview.deadlines.length && <EmptyState>No deadlines found.</EmptyState>}
          <div className="grid gap-3 lg:grid-cols-2">
            {preview.deadlines.map((deadline, index) => {
              const prefix = "deadline_" + index + "_";
              return (
                <article className="record space-y-3" key={index}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input name={prefix + "include"} type="checkbox" className="accent-brand-700"
                        defaultChecked={!!deadline.due_date && isDate(deadline.due_date)} />
                      Include deadline {index + 1}
                    </label>
                    <span className="text-xs text-slate-600">{sourceLabel(deadline.source_page)}</span>
                  </div>
                  <Field label="Title"><input className="control" name={prefix + "title"} defaultValue={deadline.title} maxLength={200} /></Field>
                  <Field label="Type"><select className="control capitalize" name={prefix + "kind"} defaultValue={deadline.kind}>
                    {DEADLINE_KINDS.map((kind) => <option value={kind} key={kind}>{kind[0].toUpperCase() + kind.slice(1)}</option>)}
                  </select></Field>
                  <DueFields prefix={prefix} date={deadline.due_date} time={deadline.due_time} />
                </article>
              );
            })}
          </div>
        </Panel>
        <div className="panel flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Selected items are saved as private.</p>
          <button type="submit" disabled={working} className="button-primary">{working ? "Saving…" : "Save reviewed import"}</button>
          {error && <div className="w-full"><LoadError>{error}</LoadError></div>}
        </div>
      </fieldset>
    </form>
  );
}
