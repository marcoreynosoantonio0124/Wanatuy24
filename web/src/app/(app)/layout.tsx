import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, supabase } = await requireUser();

  // Decide which navigation to show based on the user's roles.
  const [{ count: assetCount }, { count: rentalCount }] = await Promise.all([
    supabase.from("assets").select("id", { count: "exact", head: true }),
    supabase
      .from("agreements")
      .select("id", { count: "exact", head: true })
      .eq("renter_user_id", user.id),
  ]);
  const isRenter = (rentalCount ?? 0) > 0;
  const isLessor = (assetCount ?? 0) > 0 || !isRenter; // default to lessor view

  return (
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-emerald-50/70 via-slate-50 to-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-1 sm:gap-4">
            <Link
              href={isLessor ? "/dashboard" : "/my-rentals"}
              className="mr-2 font-bold text-emerald-700"
            >
              Due<span className="text-slate-400">Meet</span>
            </Link>
            {isLessor && (
              <>
                <NavLink href="/dashboard">Dashboard</NavLink>
                <NavLink href="/assets">Units</NavLink>
                <NavLink href="/agreements/new">New agreement</NavLink>
              </>
            )}
            {isRenter && <NavLink href="/my-rentals">My rentals</NavLink>}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}
