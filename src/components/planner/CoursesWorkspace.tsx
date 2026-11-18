"use client";

import { useState } from "react";
import CourseForm from "@/components/forms/CourseForm";
import ClassMeetingForm from "@/components/forms/ClassMeetingForm";
import { CategoryBadge, EditorRail, EditorResults, EmptyState, Panel } from "@/components/planner/ui";
import { DeleteRecord } from "@/components/planner/mutations";
import { WEEKDAYS, VISIBILITIES, dateLabel, wallClock, type ClassMeeting, type Course } from "@/lib/planner";

export default function CoursesWorkspace({ courses, meetings }: { courses: Course[]; meetings: ClassMeeting[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const stopEditing = () => setEditing(null);

  return (
    <div className="editor-grid">
      <EditorRail id="add-course">
        <Panel title="Add a course" caption="Create a course manually, or import the syllabus above."><CourseForm /></Panel>
        <Panel title="Add a class meeting" caption="Meeting dates and times use Halifax time.">
          <ClassMeetingForm courses={courses} />
        </Panel>
      </EditorRail>
      <EditorResults label="Course list">
        <Panel stickyHeading title="Your courses" caption={courses.length + (courses.length === 1 ? " course" : " courses")}>
          {!courses.length && <EmptyState>Add a course or import a syllabus to see it here.</EmptyState>}
          <div className="space-y-4">
            {courses.map((course) => {
              const rows = meetings.filter((meeting) => meeting.course_id === course.id);
              return (
                <article key={course.id} className="record" id={"course-" + course.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow">{course.code}</p>
                      <h3 className="mt-1 font-semibold">{course.name}</h3>
                    </div>
                    {editing !== course.id && (
                      <div className="flex gap-1">
                        <button type="button" className="button-quiet text-brand-800" onClick={() => setEditing(course.id)}>Edit course</button>
                        <DeleteRecord table="courses" id={course.id} label="Delete course"
                          question={"Delete " + course.code + " and all of its class meetings and deadlines?"} />
                      </div>
                    )}
                  </div>
                  {editing === course.id && <div className="mt-4"><CourseForm initial={course} onCancel={stopEditing} onSaved={stopEditing} /></div>}
                  <div className="mt-4 space-y-3">
                    {!rows.length && <p className="text-sm text-slate-600">No meetings yet.</p>}
                    {rows.map((meeting) => (
                      <div key={meeting.id} id={"meeting-" + meeting.id}
                        className="record bg-white p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <CategoryBadge kind="class" /><h4 className="text-sm font-semibold">{meeting.label}</h4>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">
                          {WEEKDAYS.filter(([day]) => meeting.weekdays.includes(day)).map(([, name]) => name).join(" / ")}
                          {" · "}{wallClock(meeting.start_time)} – {wallClock(meeting.end_time)}
                          {meeting.location && " · " + meeting.location}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {dateLabel(meeting.start_date)} – {dateLabel(meeting.end_date, { month: "short", day: "numeric", year: "numeric" })}
                          {" · "}{meeting.repeat_every_weeks === 2 ? "Every other week" : "Weekly"}
                          {" · "}{VISIBILITIES[meeting.visibility]}
                        </p>
                        {meeting.source_name && <p className="mt-1 break-all text-xs text-slate-600">
                          From {meeting.source_name}{meeting.source_page ? ", p. " + meeting.source_page : ""}
                        </p>}
                        {editing === meeting.id ? (
                          <div className="mt-4"><ClassMeetingForm courses={courses} initial={meeting} onCancel={stopEditing} onSaved={stopEditing} /></div>
                        ) : (
                          <div className="mt-2 flex gap-1">
                            <button type="button" className="button-quiet text-brand-800" onClick={() => setEditing(meeting.id)}>Edit meeting</button>
                            <DeleteRecord table="class_meetings" id={meeting.id} label="Delete meeting" question="Delete this class meeting and its future occurrences?" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>
      </EditorResults>
    </div>
  );
}
