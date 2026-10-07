import { redirect } from "next/navigation";
import { Fredoka } from "next/font/google";
import { requireUser } from "@/lib/auth";
import { DuskScene } from "@/components/dusk-scene";
import { RoleChooser } from "@/components/role-chooser";
import { AmbientBackground } from "@/components/ambient-background";
import { currentPhaseManila } from "@/lib/time-theme";

// Fun, rounded, easy-to-read display font for the welcome screen.
const display = Fredoka({ subsets: ["latin"], weight: ["500", "600", "700"] });

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const { user, supabase } = await requireUser();

  // If they've already picked a role, don't show onboarding again.
  const { data, error } = await supabase
    .from("users")
    .select("role, is_admin, profile_completed")
    .eq("id", user.id)
    .single();
  const profile = data as
    | {
        role?: string | null;
        is_admin?: boolean | null;
        profile_completed?: boolean | null;
      }
    | null;
  const role = profile?.role ?? null;
  // The founder/admin account skips role selection entirely.
  if (!error && profile?.is_admin) {
    redirect("/admin");
  }
  // Only redirect when we can actually read the column (post-migration).
  if (!error && role) {
    if (!profile?.profile_completed) redirect("/welcome/profile");
    redirect(role === "tenant" ? "/my-rentals" : "/dashboard");
  }

  const firstName = (user.email ?? "there").split("@")[0];

  return (
    <main className="relative isolate flex min-h-screen flex-col text-white">
      {/* Living time-of-day sky + a neighborhood of houses in front, so the
          sign-up screen feels like arriving at your place. */}
      <AmbientBackground initialPhase={currentPhaseManila()} />
      <DuskScene
        silhouetteOnly
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-slate-950/40 via-slate-950/25 to-slate-950/80" />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center px-5 py-5">
        <span className="flex items-center gap-2 text-lg font-bold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 text-slate-950">
            D
          </span>
          DueMeet
        </span>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 pb-8">
        <div className="mb-4 text-center sm:mb-6">
          <p className="text-xs font-medium text-emerald-300 sm:text-sm">
            Maligayang pagdating, {firstName}! 🌇
          </p>
          <h1
            className={`mt-1 text-2xl font-bold sm:mt-2 sm:text-4xl ${display.className}`}
          >
            How will you use DueMeet?
          </h1>
          <p className="mt-1.5 text-sm text-white/70 sm:mt-2">
            Pick the one that fits you — ito ang gabay mo.
          </p>
        </div>

        <RoleChooser fontClass={display.className} />

        <p className="mt-4 text-center text-[11px] text-white/50 sm:text-xs">
          You can always switch or do both later.
        </p>
      </section>
    </main>
  );
}
