import type { ReactNode } from "react";
import { AppearanceControl } from "@/components/layout/WorkspaceMotion";
import Icon from "@/components/planner/Icon";
import { CATEGORIES, VISIBILITIES, type Category, type Visibility } from "@/lib/planner";

export function PageHeader({ eyebrow, title, description, action, addTarget }: {
  eyebrow: string; title: string; description?: string; action?: ReactNode; addTarget?: string;
}) {
  return (
    <>
      <header className="workspace-header">
        <div className="min-w-0">
          <p className="eyebrow hidden md:block">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AppearanceControl />
          {addTarget && (
            <a className="button-secondary editor-jump" href={"#" + addTarget}>
              <Icon name="plus" className="size-4" />Add
            </a>
          )}
          {action}
        </div>
      </header>
      {description && <p className="workspace-intro max-w-2xl text-sm leading-6 text-slate-600">{description}</p>}
    </>
  );
}

export function EditorRail({ children, id }: { children: ReactNode; id?: string }) {
  return <div className="editor-rail workspace-anchor min-w-0 space-y-5" id={id}>{children}</div>;
}

export function EditorResults({ children, label }: { children: ReactNode; label: string }) {
  return <div className="editor-results min-w-0 space-y-5" tabIndex={0} role="region" aria-label={label}>{children}</div>;
}

export function Panel({ title, caption, action, children, stickyHeading }: {
  title: string; caption?: string; action?: ReactNode; children: ReactNode; stickyHeading?: boolean;
}) {
  return (
    <section className={"panel min-w-0" + (stickyHeading ? " has-sticky-heading" : "")}>
      <div className={"mb-5 flex flex-wrap items-start justify-between gap-3" + (stickyHeading ? " panel-heading-sticky" : "")}>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {caption && <p className="mt-1 text-sm leading-6 text-slate-600">{caption}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      <span>{label}</span>
      {children}
      {help && <span className="mt-1.5 block text-xs font-normal leading-5 text-slate-600">{help}</span>}
    </label>
  );
}

export function VisibilityField({ value = "private" }: { value?: Visibility }) {
  return (
    <Field label="Visibility" help="Roommates only see Busy or Shared items you include in a share.">
      <select className="control" name="visibility" defaultValue={value}>
        {Object.entries(VISIBILITIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </Field>
  );
}

export function CategoryBadge({ kind }: { kind: Category }) {
  const category = CATEGORIES[kind];
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: category.color, backgroundColor: category.background }}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{category.label}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/75 px-4 py-5 text-sm leading-6 text-slate-600">{children}</div>;
}

export function LoadError({ children = "Could not load this data. Refresh the page and try again." }: { children?: ReactNode }) {
  return <p className="feedback-error" role="alert">{children}</p>;
}
