import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Course, ScheduleEntry } from "@/lib/planner";

export const getPlanner = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login");
  return {
    supabase,
    now: new Date().toISOString(),
    userId: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
  };
});

export async function loadCourses() {
  const { supabase, userId } = await getPlanner();
  const { data, error } = await supabase.from("courses").select("id, code, name")
    .eq("owner_id", userId).order("code");
  return { courses: (data ?? []) as Course[], error };
}

export async function loadSchedule(from: string, to: string, scope: "mine" | "shared" | "all" = "mine") {
  const { supabase } = await getPlanner();
  const { data, error } = await supabase.rpc("planner_schedule", {
    p_from: from, p_to: to, p_scope: scope,
  });
  return { entries: (data ?? []) as ScheduleEntry[], error };
}
