"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/planner/Icon";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogout() {
    setLoading(true);
    setMessage("");
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch {
      setMessage("Could not log out. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="tos-logout">
      <button type="button" onClick={handleLogout} disabled={loading}
        className="tos-nav-link">
        <Icon name="logout" className="size-4" />{loading ? "Logging out…" : "Log out"}
      </button>
      {message && <p role="status" className="mt-1 px-2 text-xs text-rose-800">{message}</p>}
    </div>
  );
}
