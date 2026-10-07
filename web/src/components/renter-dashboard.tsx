import Image from "next/image";
import { formatPeso, formatDate, PAYMENT_METHOD_LABELS } from "@/lib/format";
import type { PaymentMethod } from "@/lib/database.types";
import { DuskScene } from "@/components/dusk-scene";
import { RenterProofForm } from "@/components/renter-proof-form";
import { RenterIdUpload } from "@/components/renter-id-upload";
import { YearForecast, type ForecastMonth } from "@/components/year-forecast";

export type RenterDashboardProps = {
  token: string;
  firstName: string;
  unitLabel: string;
  address: string | null;
  scheduleLabel: string;
  outstanding: number;
  dueNow: { remaining: number; dueDate: string; paid: number; due: number } | null;
  months: ForecastMonth[];
  unpaidForProof: { id: string; due_date: string; amount_php: number }[];
  methods: PaymentMethod[];
  paymentInstructions: string | null;
  contract: { view: string | null; download: string | null } | null;
  hasRenterId: boolean;
};

export function RenterDashboard(p: RenterDashboardProps) {
  const paidMonths = p.months.filter((m) => m.status === "paid").length;
  const collected = p.months.reduce((s, m) => s + m.paid, 0);
  const yearTotal = p.months.reduce((s, m) => s + m.due, 0);

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 pb-10">
      {/* Big warm welcome header */}
      <section className="relative min-h-[210px] overflow-hidden rounded-b-2xl sm:rounded-2xl">
        <DuskScene
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-slate-950/25" />
        <div className="relative px-5 py-7 pr-32">
          <p className="text-sm font-medium text-emerald-300">Welcome back 👋</p>
          <h1
            className="text-4xl font-bold leading-none text-white sm:text-5xl [text-shadow:0_3px_10px_rgba(0,0,0,0.9)]"
            style={{
              fontFamily: "'Caveat', ui-rounded, cursive",
              WebkitTextStroke: "1.1px rgba(2,6,23,0.7)",
              paintOrder: "stroke",
            }}
          >
            Hi, {p.firstName}!
          </h1>
          <div className="mt-3 flex items-start gap-2 text-sm text-white/90">
            <span>📍</span>
            <span>
              <span className="font-semibold text-white">{p.unitLabel}</span>
              {p.address ? ` · ${p.address}` : ""}
            </span>
          </div>
          <p className="mt-1 text-xs text-white/70">{p.scheduleLabel}</p>
          <Image
            src="/meet-mascot.png"
            alt="MEET — your DueMeet rent buddy"
            width={300}
            height={520}
            priority
            className="pointer-events-none absolute bottom-0 right-1 h-44 w-auto drop-shadow-xl sm:right-3 sm:h-52"
          />
        </div>
      </section>

      <div className="space-y-5 px-4 sm:px-0">
        {/* Amount due */}
        {p.dueNow ? (
          <div className="rounded-2xl bg-gradient-to-br from-amber-600 to-red-600 p-5 text-white shadow-lg shadow-red-600/20">
            <p className="text-sm font-medium text-white/90">
              You still owe this month ({formatDate(p.dueNow.dueDate)})
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight">
              {formatPeso(p.dueNow.remaining)}
            </p>
            {p.dueNow.paid > 0 && (
              <p className="mt-1 text-sm text-white/90">
                of {formatPeso(p.dueNow.due)} · {formatPeso(p.dueNow.paid)}{" "}
                already received
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 p-5 text-white shadow-lg shadow-emerald-600/20">
            <p className="text-sm font-medium text-white/90">Your rent</p>
            <p className="mt-1 text-3xl font-extrabold">You&apos;re all paid up 🎉</p>
            <p className="mt-1 text-sm text-white/90">Salamat po!</p>
          </div>
        )}

        {/* Send a payment */}
        {p.unpaidForProof.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
              Send a payment
            </h2>
            <RenterProofForm
              token={p.token}
              periods={p.unpaidForProof}
              methods={p.methods}
            />
          </section>
        )}

        {/* Whole-year forecast */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wide text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
            This year&apos;s rent · tap a month
          </h2>
          <p className="mb-2.5 mt-0.5 text-xs text-slate-500">
            {paidMonths} of {p.months.length} months fully paid ·{" "}
            {formatPeso(collected)} of {formatPeso(yearTotal)}
          </p>
          <YearForecast months={p.months} />
        </section>

        {/* Balance */}
        <div
          className="flex items-center justify-between rounded-xl border border-amber-200 px-4 py-3 backdrop-blur-md"
          style={{ backgroundColor: "rgba(15,23,42,0.5)" }}
        >
          <span className="text-sm font-medium text-slate-700">
            Balance up to date
          </span>
          <span className="text-lg font-bold tabular-nums text-amber-700">
            {formatPeso(p.outstanding)}
          </span>
        </div>

        {/* How to pay */}
        {(p.paymentInstructions || p.methods.length > 0) && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
              How to pay
            </h2>
            <div
              className="rounded-2xl border border-emerald-200 p-4 text-sm text-emerald-900 backdrop-blur-md"
              style={{ backgroundColor: "rgba(15,23,42,0.5)" }}
            >
              {p.paymentInstructions && (
                <p className="whitespace-pre-wrap">{p.paymentInstructions}</p>
              )}
              {p.methods.length > 0 && (
                <p className="mt-2 text-emerald-700">
                  Accepts:{" "}
                  {p.methods.map((m) => PAYMENT_METHOD_LABELS[m]).join(", ")}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Documents */}
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
            Documents
          </h2>
          <div
            className="overflow-hidden rounded-2xl border border-slate-200 backdrop-blur-md"
            style={{ backgroundColor: "rgba(15,23,42,0.5)" }}
          >
            {p.contract && (p.contract.view || p.contract.download) && (
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  📄 Your signed contract
                </span>
                <span className="flex gap-2">
                  {p.contract.view && (
                    <a
                      href={p.contract.view}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95"
                    >
                      View
                    </a>
                  )}
                  {p.contract.download && (
                    <a
                      href={p.contract.download}
                      className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 active:scale-95"
                    >
                      ⬇️ Download
                    </a>
                  )}
                </span>
              </div>
            )}
            <RenterIdUpload token={p.token} hasId={p.hasRenterId} />
          </div>
        </section>
      </div>
    </div>
  );
}
