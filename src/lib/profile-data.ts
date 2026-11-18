import { cache } from "react";
import { getPlanner } from "@/lib/planner-data";
import { emptyProfile, type Profile } from "@/lib/profile";

export const loadProfile = cache(async () => {
  const { supabase, userId } = await getPlanner();
  const { data, error } = await supabase.from("profiles")
    .select("username, avatar_id").eq("user_id", userId).maybeSingle();
  return { profile: (data as Profile | null) ?? emptyProfile, error };
});
