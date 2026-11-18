"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PlannerTable = "events" | "courses" | "class_meetings" | "deadlines" | "tasks" | "work_shifts" | "calendar_shares";

export function useSaveRecord(table: PlannerTable, refreshPage = true) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save(values: Record<string, unknown>, id?: string) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const client = createClient();
      const query = id ? client.from(table).update(values).eq("id", id) : client.from(table).insert(values);
      const { data, error } = await query.select("id").single();
      if (error || !data) {
        setError("Could not save. Check the fields and try again.");
        return false;
      }
      setNotice(id ? "Changes saved." : "Added to TomorrowOS.");
      if (refreshPage) router.refresh();
      return true;
    } catch {
      setError("Could not save. Check your connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { save, saving, error, setError, notice };
}

export function FormActions({ saving, error, notice, editing, onCancel, label }: {
  saving: boolean; error?: string; notice?: string; editing?: boolean;
  onCancel?: () => void; label: string;
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="button-primary" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : label}
        </button>
        {onCancel && <button type="button" className="button-secondary" disabled={saving} onClick={onCancel}>Cancel</button>}
      </div>
      {error && <p className="feedback-error" role="alert">{error}</p>}
      {!error && notice && <p className="feedback-ok" role="status">{notice}</p>}
    </>
  );
}

export function DeleteRecord({ table, id, label = "Delete", question, refreshPage = true, onDeleted }: {
  table: PlannerTable; id: string; label?: string; question: string; refreshPage?: boolean; onDeleted?: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(question)) return;
    setDeleting(true);
    setError("");
    try {
      const { data, error } = await createClient().from(table).delete().eq("id", id).select("id");
      if (error || data?.length !== 1) {
        setError("Could not remove this item. Refresh and try again.");
        return;
      }
      onDeleted?.();
      if (refreshPage) router.refresh();
    } catch {
      setError("Could not remove this item. Check your connection.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={remove} disabled={deleting} className="button-quiet text-rose-700 hover:bg-rose-50">
        {deleting ? "Removing…" : label}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
