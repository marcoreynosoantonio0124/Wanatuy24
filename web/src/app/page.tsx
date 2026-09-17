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
            W
          </span>
          Wanatuy24
        </span>
        <nav className="hidden items-center gap-7 text-sm text-white/80 md:flex">
          <a href="#landlords" className="hover:text-white">Landlords</a>
          <a href="#renters" className="hover:text-white">Renters</a>
          <a href="#how" className="hover:text-white">How it works</a>
        </nav>
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

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
          Set the rent once and Wanatuy24 tracks every due date, reminds your
          renters, and keeps proof of every payment — GCash, Maya, bank, or cash.
          Renters pay from a simple link. No account needed.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href={user ? "/dashboard" : "/login"}
            className="rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
          >
            {user ? "Go to dashboard" : "Get started free"} →
          </Link>
          <a
            href="#how"
            className="rounded-xl border border-white/25 bg-white/5 px-6 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/10"
          >
            See how it works
          </a>
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

      {/* ---------- How it works (glass, over the wallpaper) ---------- */}
      <section id="how" className="mx-auto w-full max-w-6xl px-5 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white drop-shadow">
          How Wanatuy24 works
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-white/70">
          One place for landlords to manage rentals, and a dead-simple way for
          renters to pay and prove it.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              id={f.anchor}
              className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-md"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/20 text-xl">
                {f.icon}
              </div>
              <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                {f.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <Link
            href={user ? "/dashboard" : "/login"}
            className="rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            {user ? "Go to dashboard" : "Get started free"} →
          </Link>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-5 py-8 text-center text-sm text-white/50">
        Wanatuy24 · Install it from your browser to use it like an app.
      </footer>
    </main>
  );
}

const STATS = [
  { value: "₱0", label: "to start — free" },
  { value: "5 min", label: "to set up a unit" },
  { value: "Auto", label: "due-date reminders" },
  { value: "24/7", label: "renter self-service" },
];

const FEATURES = [
  {
    anchor: "landlords",
    icon: "🏠",
    title: "For landlords: every unit in one place",
    body: "Houses, rooms, apartments, vehicles, and commercial spaces — set the terms once and the due dates generate themselves.",
  },
  {
    anchor: "reminders",
    icon: "🔔",
    title: "Reminders that do the nagging",
    body: "Due-date reminders go out automatically by email or push, before and after the deadline — so you don't have to chase.",
  },
  {
    anchor: "renters",
    icon: "🧾",
    title: "For renters: pay and prove it",
    body: "Open a simple link — no account needed — to see what's due and send a receipt. The landlord confirms in a tap.",
  },
];
