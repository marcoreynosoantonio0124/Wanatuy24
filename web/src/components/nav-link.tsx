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
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition active:scale-95 ${
        active
          ? "bg-emerald-100 text-emerald-800 shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200"
      }`}
    >
      {children}
    </Link>
  );
}
