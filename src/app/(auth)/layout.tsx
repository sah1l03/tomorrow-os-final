import type { ReactNode } from "react";
import Link from "next/link";
import Brand from "@/components/layout/Brand";
import Icon from "@/components/planner/Icon";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const configured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return (
    <main className="tos-auth">
      <aside className="tos-auth-poster">
        <div className="tos-auth-art" aria-hidden="true" />
        <Link href="/example" className="tos-auth-brand" aria-label="TomorrowOS example week"><Brand /></Link>
        <div className="tos-auth-pitch">
          <p className="tos-focus-kicker"><span /> Your week in one place</p>
          <h2>A little more room for tomorrow.</h2>
          <p>See classes, deadlines, shifts, and personal plans on one calendar.</p>
          <Link href="/example" className="tos-hero-link">Explore an example week <Icon name="arrow" className="size-4" /></Link>
        </div>
      </aside>
      <section className="tos-auth-main" aria-label="Your account">
        <div className="tos-auth-card">
          <div className="tos-auth-mobile-brand"><Brand /></div>
          {configured ? children : <>
            <h1>Connect TomorrowOS</h1>
            <p className="tos-muted mt-2">Add your Supabase settings to <code>.env.local</code> to open an account. See README.md for setup.</p>
            <Link href="/example" className="button-primary mt-5">Open example week</Link>
          </>}
          {configured && <Link href="/example" className="tos-auth-example">Try the example week <Icon name="arrow" className="size-4" /></Link>}
        </div>
      </section>
    </main>
  );
}
