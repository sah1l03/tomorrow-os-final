"use client";

import { useState, type FormEvent } from "react";
import SyllabusReview from "@/components/planner/SyllabusReview";
import { EditorRail, EditorResults, Field, LoadError, Panel } from "@/components/planner/ui";
import Icon from "@/components/planner/Icon";
import { isSyllabusPreview, type SyllabusPreview } from "@/lib/syllabus-preview";
import type { Course } from "@/lib/planner";

const MAX_PDF_BYTES = 4 * 1024 * 1024;

export default function SyllabusImporter({ courses }: { courses: Course[] }) {
  const [preview, setPreview] = useState<{ fileName: string; data: SyllabusPreview } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const file = fields.get("file");
    if (!(file instanceof File) || !file.size || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a syllabus PDF.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError("Choose a PDF that is 4 MB or smaller.");
      return;
    }
    setAnalyzing(true);
    setError("");
    setPreview(null);

    try {
      const response = await fetch("/api/syllabus/preview", { method: "POST", body: fields });
      const body = (await response.json()) as { preview?: unknown; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not analyze the syllabus.");
      if (!isSyllabusPreview(body.preview)) throw new Error("Could not read the returned draft. Try again.");
      setPreview({ fileName: file.name, data: body.preview });
    } catch (error) {
      setError(error instanceof Error && !(error instanceof SyntaxError)
        ? error.message : "Could not analyze the syllabus. Try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="editor-grid editor-grid-import">
      <EditorRail>
        <Panel title="Upload a syllabus" caption="One course outline in PDF format, up to 4 MB.">
          <form onSubmit={submit} className="space-y-4">
            <fieldset className="space-y-4" disabled={analyzing}>
              <Field label="Syllabus PDF">
                <input className="control file:mr-3 file:text-sm file:font-semibold file:text-brand-800" name="file" type="file"
                  accept="application/pdf,.pdf" required />
              </Field>
              <button className="button-primary w-full" type="submit" disabled={analyzing}>
                <Icon name="import" className="size-4" />{analyzing ? "Reading syllabus…" : "Analyze syllabus"}
              </button>
            </fieldset>
            <p className="text-xs leading-5 text-slate-600">
              Google Gemini analyzes the PDF. TomorrowOS saves only the items you approve.{" "}
              <a className="font-medium text-brand-800 underline underline-offset-2"
                href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Google&apos;s data-use terms</a>
            </p>
            {error && <LoadError>{error}</LoadError>}
          </form>
        </Panel>
      </EditorRail>
      <EditorResults label="Syllabus preview">
        {preview ? <SyllabusReview preview={preview.data} fileName={preview.fileName} courses={courses} /> : (
          <section className="panel grid min-h-60 place-items-center text-center sm:min-h-80" aria-busy={analyzing}>
            <div className="max-w-sm">
              <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-brand-100 text-brand-800">
                <Icon name="import" />
              </span>
              <h2 className="text-lg font-semibold" role="status">{analyzing ? "Reading your course outline" : "Your preview starts here"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {analyzing ? "Analysis can take up to three minutes. Keep this page open." :
                  "Upload a syllabus to review its course details, class meetings, and deadlines before adding them."}
              </p>
            </div>
          </section>
        )}
      </EditorResults>
    </div>
  );
}
