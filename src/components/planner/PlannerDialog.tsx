"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import Icon from "@/components/planner/Icon";

export default function PlannerDialog({ title, caption, leading, variant, children, onClose }: {
  title: string; caption?: string; leading?: ReactNode; variant?: "conversation" | "scene"; children: ReactNode; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const captionId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!element.open) element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog ref={dialog} className={"planner-dialog" + (variant ? " " + variant + "-dialog" : "")} aria-labelledby={titleId}
      aria-describedby={caption ? captionId : undefined}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
      <header className="planner-dialog-heading">
        <div className="flex min-w-0 items-center gap-3">
          {leading}
          <div className="min-w-0">
            <h2 id={titleId} className="wrap-anywhere text-lg font-semibold tracking-tight">{title}</h2>
            {caption && <p id={captionId} className="mt-0.5 text-sm text-slate-600">{caption}</p>}
          </div>
        </div>
        <button className="button-quiet shrink-0 text-slate-700" type="button" aria-label="Close dialog" onClick={onClose}>
          <Icon name="close" className="size-5" />
        </button>
      </header>
      <div className={variant ? variant + "-body" : "p-4 sm:p-6"}>{children}</div>
    </dialog>
  );
}
