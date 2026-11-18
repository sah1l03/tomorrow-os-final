"use client";
import Link from "next/link";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setMessage(
        "Check your email for a confirmation link. Open it in this browser on this computer."
      );
      setPassword("");
    } catch {
      setMessage(
        "Could not complete signup. Check your connection and Supabase settings."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tos-auth-form">

        <h1>
          Create your account
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Keep your schedules together.
        </p>

        <form onSubmit={handleSignup} className="mt-6 space-y-5">
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
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              className="control"
            />

            <p className="mt-2 text-xs text-slate-500">
              Use at least 8 characters.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="button-primary w-full"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          {message && (
            <p role="status" className="text-sm leading-6 text-slate-700">
              {message}
            </p>
          )}
        </form>
        <p className="mt-6 text-sm text-slate-600">
         Already have an account?{" "}
        <Link
          href="/login"
           className="font-medium text-brand-800 hover:underline"
        >
        Log in
        </Link>
</p>
    </div>
  );
}
