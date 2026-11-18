"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Brand from "@/components/layout/Brand";
import LogoutButton from "@/components/layout/LogoutButton";
import Icon, { type IconName } from "@/components/planner/Icon";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { avatarUrl, profileInitials, type Profile } from "@/lib/profile";

type NavItem = { label: string; href: string; icon: IconName };
const workspace: NavItem[] = [
  { label: "Today", href: "/dashboard", icon: "sunrise" },
  { label: "Calendar", href: "/calendar", icon: "calendar" },
  { label: "Tasks", href: "/tasks", icon: "tasks" },
];
const shared: NavItem = { label: "Shared", href: "/shared", icon: "shared" };
const navigation: { title: string; items: NavItem[] }[] = [
  { title: "Workspace", items: workspace },
  { title: "Collections", items: [
    { label: "Courses", href: "/courses", icon: "courses" },
    { label: "Deadlines", href: "/deadlines", icon: "deadlines" },
    { label: "Work shifts", href: "/work", icon: "work" },
    { label: "Personal", href: "/personal", icon: "personal" },
  ] },
  { title: "Plan together", items: [
    shared,
    { label: "Availability", href: "/availability", icon: "lock" },
  ] },
];

export default function Sidebar({ email, profile }: { email: string; profile: Profile }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [menuOpen]);

  function navLink({ label, href, icon }: NavItem) {
    return (
      <Link prefetch={false} key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={close} className="tos-nav-link">
        <Icon name={icon} className="size-[1.125rem]" /><span>{label}</span>
      </Link>
    );
  }

  return (
    <>
      <aside className="workspace-sidebar tos-sidebar">
        <div className="tos-sidebar-top">
          <Link prefetch={false} href="/dashboard" onClick={close} aria-label="TomorrowOS home"><Brand /></Link>
          <button type="button" aria-expanded={menuOpen} aria-controls="workspace-menu"
            onClick={() => setMenuOpen((open) => !open)} className="button-secondary tos-menu-toggle">
            <Icon name={menuOpen ? "close" : "menu"} className="size-4" />{menuOpen ? "Close" : "Menu"}
          </button>
        </div>
        <div id="workspace-menu" className={"workspace-menu tos-menu" + (menuOpen ? " is-open" : "")}>
          <nav aria-label="Main navigation" className="tos-nav">
            {navigation.map(({ title, items }) => (
              <div className="tos-nav-group" key={title}>
                <p>{title}</p>
                {items.map(navLink)}
              </div>
            ))}
            <div className="tos-nav-import">{navLink({ label: "Import syllabus", href: "/import", icon: "import" })}</div>
          </nav>
          <div className="tos-sidebar-account">
            <Link href="/profile" prefetch={false} aria-label="Profile" aria-current={pathname === "/profile" ? "page" : undefined}
              onClick={close} className="tos-profile-link">
              <ProfileAvatar src={avatarUrl(profile.avatar_id)} initials={profileInitials(profile.username, email)} />
              <span className="min-w-0">
                <strong>{profile.username ? "@" + profile.username : "Profile"}</strong>
                <small title={email}>{email || "Signed in"}</small>
              </span>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </aside>
      <nav className="tos-mobile-nav" aria-label="Quick navigation">
        {[...workspace, shared].map(navLink)}
      </nav>
    </>
  );
}
