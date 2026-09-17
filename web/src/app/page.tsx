import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NeighborhoodScene } from "@/components/neighborhood-scene";

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
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <span className="text-lg font-bold text-emerald-700">
          Wanatuy<span className="text-slate-400">24</span>
        </span>
        <Link
          href={user ? "/dashboard" : "/login"}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {user ? "Open dashboard" : "Sign in"}
        </Link>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              For Filipino landlords &amp; renters
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Rent collection without the follow-up stress.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-600">
              Landlords set the rent once and let Wanatuy24 count the due dates,
              send reminders, and keep proof of every payment. Renters get a
              simple link to see what&apos;s due and send proof — GCash, Maya,
              bank, or cash. No account needed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={user ? "/dashboard" : "/login"}
                className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700"
              >
                {user ? "Go to dashboard" : "Get started free"}
              </Link>
              <a
                href="#how"
                className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-white"
              >
                How it works
              </a>
            </div>
          </div>
          <NeighborhoodScene
            preserveAspectRatio="xMidYMid slice"
            className="aspect-[16/10] w-full overflow-hidden rounded-2xl border border-emerald-100 shadow-sm"
          />
        </div>

        <div id="how" className="mt-20 grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        Wanatuy24 · Install it from your browser to use it like an app.
      </footer>
    </main>
  );
}

const FEATURES = [
  {
    icon: "🏠",
    title: "For landlords: every unit in one place",
    body: "Houses, rooms, apartments, vehicles, and commercial spaces — set the terms once and the due dates generate themselves.",
  },
  {
    icon: "🔔",
    title: "Reminders that do the nagging",
    body: "Due-date reminders go out automatically by email or push, before and after the deadline — so you don't have to chase.",
  },
  {
    icon: "🧾",
    title: "For renters: pay and prove it",
    body: "Open a simple link — no account needed — to see what's due and send a receipt. The landlord confirms in a tap.",
  },
];
