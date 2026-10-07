import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { NavLink } from "@/components/nav-link";
import { AmbientBackground } from "@/components/ambient-background";
import { currentPhaseManila } from "@/lib/time-theme";
import { RETURN_COOKIE, readReturnToken } from "@/lib/impersonation";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, supabase } = await requireUser();

  // Decide which navigation to show based on the user's role + data.
  const [{ count: assetCount }, { count: rentalCount }, profileRes] =
    await Promise.all([
      supabase.from("assets").select("id", { count: "exact", head: true }),
      supabase
        .from("agreements")
        .select("id", { count: "exact", head: true })
        .eq("renter_user_id", user.id),
      supabase
        .from("users")
        .select("role, is_admin, profile_completed")
        .eq("id", user.id)
        .single(),
    ]);

  // First-time users (role not yet chosen) go to the welcome screen. We only
  // gate when the column is actually readable, so the app still works if the
  // migration hasn't been run yet (profileRes.error covers that case).
  const profile = profileRes.data as
    | {
        role?: string | null;
        is_admin?: boolean | null;
        profile_completed?: boolean | null;
      }
    | null;
  const role = profile?.role ?? null;
  const isAdmin = profile?.is_admin === true;
  if (!profileRes.error && !role && !isAdmin) {
    redirect("/welcome");
  }
  // Role chosen but profile not filled in yet → finish the one-time record.
  if (!profileRes.error && !isAdmin && role && !profile?.profile_completed) {
    redirect("/welcome/profile");
  }

  // The founder/admin account is monitoring-only: it has no lessor or renter
  // dashboard of its own, just the Command Center (with its preview tools).
  const isRenter = !isAdmin && (role === "tenant" || (rentalCount ?? 0) > 0);
  const isLessor =
    !isAdmin && (role === "lessor" || (assetCount ?? 0) > 0 || !isRenter);

  // "Act as a user" (admin impersonation): when the signed return cookie is
  // present, the admin is inside someone else's account — show a bar to step
  // back out.
  const actingAs = readReturnToken((await cookies()).get(RETURN_COOKIE)?.value);

  return (
    <div className="app-dark relative isolate flex min-h-full flex-1 flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <AmbientBackground initialPhase={currentPhaseManila()} />
      {actingAs && (
        <div className="relative z-30 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-amber-950">
          <span>👀 You&apos;re acting as {user.email} (admin test mode)</span>
          <a
            href="/act/stop"
            className="rounded-md bg-amber-950/90 px-2.5 py-0.5 text-xs font-bold text-amber-50 transition hover:bg-amber-950 active:scale-95"
          >
            ↩ Back to Command Center
          </a>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-1 sm:gap-4">
            <Link
              href={isAdmin ? "/admin" : isLessor ? "/dashboard" : "/my-rentals"}
              className="mr-2 rounded-md px-1 py-0.5 font-bold text-emerald-400 transition hover:text-emerald-300 active:scale-95"
            >
              Due<span className="text-slate-500">Meet</span>
            </Link>
            {isLessor && (
              <>
                <NavLink href="/dashboard">Dashboard</NavLink>
                <NavLink href="/assets">Units</NavLink>
                <NavLink href="/agreements/new">Make an agreement</NavLink>
                <NavLink href="/contracts">🗂️ Contracts</NavLink>
              </>
            )}
            {isRenter && <NavLink href="/my-rentals">My rentals</NavLink>}
            {isAdmin && <NavLink href="/admin">🎛️ Command Center</NavLink>}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:inline">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 active:scale-95"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </div>
    </div>
  );
}
