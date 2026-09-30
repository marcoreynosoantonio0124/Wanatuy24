import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DuskScene } from "@/components/dusk-scene";
import { RoleChooser } from "@/components/role-chooser";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const { user, supabase } = await requireUser();

  // If they've already picked a role, don't show onboarding again.
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (data as { role?: string | null } | null)?.role ?? null;
  // Only redirect when we can actually read the column (post-migration).
  if (!error && role) {
    redirect(role === "tenant" ? "/my-rentals" : "/dashboard");
  }

  const firstName = (user.email ?? "there").split("@")[0];

  return (
    <main className="relative flex min-h-screen flex-col text-white">
      {/* Full-page dusk wallpaper (same as the landing page). */}
      <div className="fixed inset-0 -z-10">
        <DuskScene preserveAspectRatio="xMidYMid slice" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/80 to-slate-950/92" />
      </div>

      <header className="mx-auto flex w-full max-w-5xl items-center px-5 py-5">
        <span className="flex items-center gap-2 text-lg font-bold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 text-slate-950">
            D
          </span>
          DueMeet
        </span>
      </header>

      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-5 pb-16">
        <div className="mb-7 text-center">
          <p className="text-sm font-medium text-emerald-300">
            Maligayang pagdating, {firstName}! 🌇
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            How will you use DueMeet?
          </h1>
          <p className="mt-2 text-white/70">
            Pick the one that fits you. Ito ang magiging gabay mo — you can always
            do both later.
          </p>
        </div>

        <RoleChooser />

        <p className="mt-6 text-center text-xs text-white/50">
          Not sure? Most people start as a <strong>Lessor</strong> if they own a
          place to rent out, or a <strong>Tenant</strong> if they’re renting one.
        </p>
      </section>
    </main>
  );
}
