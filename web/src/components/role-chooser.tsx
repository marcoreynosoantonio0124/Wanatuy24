"use client";

import Image from "next/image";
import { useFormStatus } from "react-dom";
import { chooseRole } from "@/app/welcome/actions";

/** The two matching role boxes shown on the welcome screen. */
export function RoleChooser({
  fontClass = "",
  comicClass = "",
}: {
  fontClass?: string;
  comicClass?: string;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
      <RoleCard
        role="lessor"
        accent="emerald"
        mascot="/due-mascot.png"
        mascotAlt="DUE — the lessor mascot"
        tagalog="NAGPAPAUPA"
        title="I'm a Lessor"
        subtitle="I own units and collect rent."
        points={[
          "Send automatic reminders to your tenants — due dates, balances, and more",
          "Keep every important document in one place — contracts, IDs, proof of payment",
          "See each property's full financial record — income and balance",
          "Monitor all your properties in one place",
        ]}
        cta="Continue as Lessor"
        fontClass={fontClass}
        comicClass={comicClass}
      />
      <RoleCard
        role="tenant"
        accent="amber"
        mascot="/meet-mascot.png"
        mascotAlt="MEET — the renter mascot"
        tagalog="UMUUPA"
        title="I'm a Tenant"
        subtitle="I rent a place and pay rent."
        points={[
          "Get reminded of your due dates, even on your busiest days",
          "Tell your landlord you've paid — no awkward follow-ups",
          "Keep a clean record of everything you've paid",
          "Keep digital copies of all your documents in one place",
        ]}
        cta="Continue as Tenant"
        fontClass={fontClass}
        comicClass={comicClass}
      />
    </div>
  );
}

type CardProps = {
  role: "lessor" | "tenant";
  accent: "emerald" | "amber";
  mascot: string;
  mascotAlt: string;
  tagalog: string;
  title: string;
  subtitle: string;
  points: string[];
  cta: string;
  fontClass: string;
  comicClass: string;
};

function RoleCard(props: CardProps) {
  return (
    <form action={chooseRole} className="h-full">
      <input type="hidden" name="role" value={props.role} />
      <CardButton {...props} />
    </form>
  );
}

function CardButton({
  accent,
  mascot,
  mascotAlt,
  tagalog,
  title,
  subtitle,
  points,
  cta,
  fontClass,
  comicClass,
}: CardProps) {
  const { pending } = useFormStatus();

  const isAmber = accent === "amber";
  const ring = isAmber
    ? "hover:border-amber-400/70 hover:shadow-amber-500/20"
    : "hover:border-emerald-400/70 hover:shadow-emerald-500/20";
  const pillBg = isAmber
    ? "bg-amber-400 text-slate-950"
    : "bg-emerald-400 text-slate-950";
  const check = isAmber ? "text-amber-300" : "text-emerald-300";
  const ctaBg = isAmber
    ? "bg-amber-400 text-slate-950"
    : "bg-emerald-400 text-slate-950";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex h-full w-full flex-col gap-4 rounded-3xl border border-white/15 bg-white/[0.07] p-5 text-left backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/[0.1] hover:shadow-2xl active:translate-y-0 active:scale-[0.99] disabled:opacity-70 sm:p-6 ${ring}`}
    >
      {/* Top region: a fixed height in both cards so the labels, titles and
          bullets line up across the two boxes. Mascot on the outer edge. */}
      <div
        className={`flex h-[210px] items-center gap-3 sm:h-[300px] sm:gap-4 ${
          isAmber ? "flex-row-reverse" : ""
        }`}
      >
        <Image
          src={mascot}
          alt={mascotAlt}
          width={200}
          height={320}
          priority
          className="h-36 w-auto shrink-0 drop-shadow-xl sm:h-[260px] lg:h-[285px]"
        />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5 text-center sm:gap-3">
          <span
            className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-base font-bold tracking-wide shadow-lg sm:px-6 sm:py-2.5 sm:text-2xl ${pillBg} ${comicClass}`}
          >
            {tagalog}
          </span>
          <h3 className={`text-xl font-bold text-white sm:text-3xl ${fontClass}`}>
            {title}
          </h3>
          <p className="text-sm text-white/70 sm:text-base">{subtitle}</p>
        </div>
      </div>

      {/* Details */}
      <ul className="flex flex-col gap-2.5 sm:gap-3">
        {points.map((p) => (
          <li
            key={p}
            className="flex items-start gap-2.5 text-sm leading-snug text-white/90 sm:text-base"
          >
            <span className={`mt-0.5 shrink-0 font-bold ${check}`}>✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <span
        className={`mt-auto flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-bold shadow-lg sm:text-lg ${ctaBg} ${fontClass}`}
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
