import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DuskScene } from "@/components/dusk-scene";

export default async function LandingPage() {
  let user = null;
  try {
    const supabase = await createClient();
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    // Backend not reachable yet — show the signed-out marketing page.
  }

  return (
    <main className="relative flex min-h-screen flex-1 flex-col text-white">
      {/* ---------- Full-page wallpaper background ---------- */}
      <div className="fixed inset-0 -z-10">
        <DuskScene
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/75 to-slate-950/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 to-slate-950/20" />
      </div>

      {/* ---------- Nav ---------- */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2 text-lg font-bold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 text-slate-950">
            D
          </span>
          DueMeet
        </span>
        <Link
          href={user ? "/dashboard" : "/login"}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          {user ? "Dashboard" : "Sign in"}
        </Link>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-20">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-200 backdrop-blur">
          🛡️ Built for Filipino landlords &amp; renters
        </span>

        <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow sm:text-6xl">
          Collect rent without
          <br />
          <span className="text-emerald-400">the follow-up.</span>
        </h1>

        {/* Taglish punchline */}
        <p className="mt-5 text-2xl font-bold text-emerald-300 drop-shadow sm:text-3xl">
          Wala nang habulan sa upa. 🇵🇭
        </p>
        <p className="mt-2 text-lg font-medium text-white/85">
          Hindi mo na kailangan mag-remind — para bawas stress.
        </p>

        <p className="mt-5 max-w-xl leading-relaxed text-white/75">
          Set the rent once — we track every due date, remind your renters, and
          keep proof of every payment (GCash, Maya, bank, or cash). Renters pay
          from a simple link. No account needed.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href={user ? "/dashboard" : "/login"}
            className="rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
          >
            {user ? "Go to dashboard" : "Get started — libre"} →
          </Link>
        </div>

        <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-x-10 gap-y-7 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <dt className="text-3xl font-bold text-emerald-400">{s.value}</dt>
              <dd className="mt-1 text-sm text-white/70">{s.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-5 py-8 text-center text-sm text-white/50">
        I-install mo sa browser mo para parang app. 📲
      </footer>
    </main>
  );
}

const STATS = [
  { value: "₱0", label: "para magsimula — libre" },
  { value: "5 min", label: "para mag-set up ng unit" },
  { value: "Auto", label: "paalala sa due date" },
  { value: "24/7", label: "self-service para sa renter" },
];
