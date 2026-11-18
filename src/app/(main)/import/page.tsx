import type { Metadata } from "next";
import SyllabusImporter from "@/components/planner/SyllabusImporter";
import { LoadError, PageHeader } from "@/components/planner/ui";
import { loadCourses } from "@/lib/planner-data";

export const metadata: Metadata = { title: "Import syllabus" };

export default async function SyllabusImportPage() {
  const { courses, error } = await loadCourses();
  return (
    <div className="workspace workspace-split">
      <PageHeader eyebrow="Course import" title="Start with your syllabus"
        description="Turn a course outline into an editable draft of classes and deadlines." />
      {error ? <LoadError /> : <SyllabusImporter courses={courses} />}
    </div>
  );
}
