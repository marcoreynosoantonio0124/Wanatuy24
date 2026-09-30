"use client";

import { useFormStatus } from "react-dom";
import { chooseRole } from "@/app/welcome/actions";
import { LessorScene, TenantScene } from "./role-illustrations";

/** The two big role boxes shown on the welcome screen. */
export function RoleChooser({ fontClass = "" }: { fontClass?: string }) {
  return (
    <div className="grid w-full gap-5 sm:grid-cols-2">
      <RoleCard
        role="lessor"
        scene={<LessorScene className="h-32 w-full" />}
        tagalog="NAGPAPAUPA"
        title="I'm a Lessor"
        subtitle="I own units and collect rent."
        accent="emerald"
        fontClass={fontClass}
        points={[
          "Add your units (rooms, apartments, houses…)",
          "Create an agreement for each renter",
          "Track due dates & mark payments as paid",
          "Send friendly reminders in one tap",
        ]}
        cta="Continue as Lessor"
      />
      <RoleCard
        role="tenant"
        scene={<TenantScene className="h-32 w-full" />}
        tagalog="UMUUPA"
        title="I'm a Tenant"
        subtitle="I rent a place and pay rent."
        accent="amber"
        fontClass={fontClass}
        points={[
          "See your due dates in one place",
          "Upload proof of payment (GCash, Maya…)",
          "Keep a clean record of everything you've paid",
          "Get reminders so you never miss a due date",
        ]}
        cta="Continue as Tenant"
      />
    </div>
  );
}

function RoleCard({
  role,
  scene,
  tagalog,
  title,
  subtitle,
  points,
  accent,
  fontClass,
  cta,
}: {
  role: "lessor" | "tenant";
  scene: React.ReactNode;
  tagalog: string;
  title: string;
  subtitle: string;
  points: string[];
  accent: "emerald" | "amber";
  fontClass: string;
  cta: string;
}) {
  return (
    <form action={chooseRole}>
      <input type="hidden" name="role" value={role} />
      <CardButton
        scene={scene}
        tagalog={tagalog}
        title={title}
        subtitle={subtitle}
        points={points}
        accent={accent}
        fontClass={fontClass}
        cta={cta}
      />
    </form>
  );
}

function CardButton({
  scene,
  tagalog,
  title,
  subtitle,
  points,
  accent,
  fontClass,
  cta,
}: {
  scene: React.ReactNode;
  tagalog: string;
  title: string;
  subtitle: string;
  points: string[];
  accent: "emerald" | "amber";
  fontClass: string;
  cta: string;
}) {
  const { pending } = useFormStatus();
  const ring =
    accent === "emerald"
      ? "hover:border-emerald-400/70 hover:shadow-emerald-500/20"
      : "hover:border-amber-400/70 hover:shadow-amber-500/20";
  const dot = accent === "emerald" ? "text-emerald-300" : "text-amber-300";
  const bubbleText = accent === "emerald" ? "text-emerald-700" : "text-amber-700";
  const ctaBg =
    accent === "emerald"
      ? "bg-emerald-500 text-slate-950"
      : "bg-amber-400 text-slate-950";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex h-full w-full flex-col rounded-3xl border border-white/15 bg-white/10 p-6 text-left backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl active:translate-y-0 active:scale-[0.98] disabled:opacity-70 ${ring}`}
    >
      {/* illustration + Tagalog speech bubble */}
      <div className="relative mx-auto mb-2 w-full max-w-[220px]">
        <div className="pointer-events-none absolute -top-1 right-0 z-10">
          <span
            className={`block rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-lg ${bubbleText} ${fontClass}`}
          >
            {tagalog}
          </span>
          <span className="absolute -bottom-1 left-5 h-3 w-3 rotate-45 rounded-[2px] bg-white shadow-lg" />
        </div>
        {scene}
      </div>

      <h3 className={`text-2xl font-bold text-white ${fontClass}`}>{title}</h3>
      <p className="mt-0.5 text-sm text-white/70">{subtitle}</p>

      <ul className="mt-4 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-white/85">
            <span className={`mt-0.5 shrink-0 ${dot}`}>✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <span
        className={`mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg ${ctaBg} ${fontClass}`}
      >
        {pending && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/40 border-t-transparent"
          />
        )}
        {pending ? "Setting up…" : cta}
        {!pending && <span aria-hidden>→</span>}
      </span>
    </button>
  );
}
