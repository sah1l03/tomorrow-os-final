"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace("/dashboard");

      router.refresh();
    } catch {
      setMessage(
        "Could not log in. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tos-auth-form">

        <h1>
          Welcome back
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Log in to view your schedules.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              className="control"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              className="control"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="button-primary w-full"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          {message && (
            <p role="status" className="text-sm leading-6 text-slate-700">
              {message}
            </p>
          )}
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-brand-800 hover:underline"
          >
            Sign up
          </Link>
        </p>
    </div>
  );
}
