"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Top-nav link that highlights the page you're on (an emerald "pill") and
 * reacts on hover and tap — so the nav feels alive on touch devices, not just
 * with a mouse.
 */
export function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  /** Emoji shown before the label on larger screens only (phones need the room). */
  icon?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-md px-1.5 py-1.5 text-[13px] font-medium transition active:scale-95 sm:px-2.5 sm:text-sm ${
        active
          ? "bg-emerald-500/15 text-emerald-300 shadow-sm ring-1 ring-emerald-400/20"
          : "text-slate-300 hover:bg-white/10 hover:text-white active:bg-white/15"
      }`}
    >
      {icon && <span className="hidden sm:inline">{icon} </span>}
      {children}
    </Link>
  );
}
