"use client";

import { useState } from "react";
import Icon from "@/components/planner/Icon";
import { busyCalendar, busyText, type BusyDay } from "@/lib/busy-week";

export default function BusyExport({ days }: { days: BusyDay[] }) {
  const [status, setStatus] = useState("");
  const [showText, setShowText] = useState(false);
  const canExport = days.some(({ blocks }) => blocks.length);

  async function copy() {
    try {
      await navigator.clipboard.writeText(busyText(days));
      setShowText(false);
      setStatus("Busy times copied. Paste them into a message when you’re ready.");
    } catch {
      setShowText(true);
      setStatus("Select and copy the text below.");
    }
  }

  function download() {
    const blob = new Blob([busyCalendar(days)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tomorrowos-busy-" + days[0].date + ".ics";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus("Calendar file downloaded.");
  }

  return (
    <div className="grid justify-items-start gap-3">
      <button type="button" className="button-primary" disabled={!canExport} onClick={() => void copy()}>
        <Icon name="copy" className="size-4" /> Copy busy times
      </button>
      <button type="button" className="button-secondary" disabled={!canExport} onClick={download}>
        <Icon name="download" className="size-4" /> Download calendar file
      </button>
      {status && <p className="tos-muted" role="status">{status}</p>}
      {showText && <textarea className="control" aria-label="Busy times to copy" readOnly value={busyText(days)} rows={7} />}
    </div>
  );
}
