"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import {
  createAgreement,
  type AgreementFormState,
} from "@/app/(app)/agreements/actions";
import {
  ALL_PAYMENT_METHODS,
  FREQUENCY_LABELS,
  PAYMENT_METHOD_LABELS,
  WEEKDAYS,
} from "@/lib/format";
import type { AgreementFrequency } from "@/lib/database.types";

type AssetOption = { id: string; label: string };

const label = "mb-1 block text-sm font-medium text-slate-700";
const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

export function AgreementForm({ assets }: { assets: AssetOption[] }) {
  const [state, action, pending] = useActionState<AgreementFormState, FormData>(
    createAgreement,
    {},
  );
  const [frequency, setFrequency] = useState<AgreementFrequency>("monthly");
  const isWeekly = frequency === "weekly" || frequency === "biweekly";

  // Lease term: pick a length (in months) and the end date + schedule fill in
  // automatically. "custom" lets the lessor type an end date by hand.
  const [term, setTerm] = useState<string>("12");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const autoEnd = term !== "custom";

  useEffect(() => {
    if (term === "custom" || !startDate) return;
    const d = new Date(`${startDate}T00:00:00`);
    d.setMonth(d.getMonth() + Number(term));
    d.setDate(d.getDate() - 1); // ends the day before the anniversary
    setEndDate(d.toISOString().slice(0, 10));
  }, [term, startDate]);

  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [prefill, setPrefill] = useState<Record<string, unknown> | null>(null);
  const [ai, setAi] = useState<{ loading?: boolean; msg?: string; error?: string }>(
    {},
  );

  // Apply extracted values once (after any frequency change has re-rendered).
  useEffect(() => {
    if (!prefill || !formRef.current) return;
    const f = formRef.current;
    const setVal = (name: string, val: unknown) => {
      if (val === null || val === undefined || val === "") return;
      const el = f.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null;
      if (el) el.value = String(val);
    };
    setVal("renter_name", prefill.renter_name);
    setVal("renter_phone", prefill.renter_phone);
    setVal("renter_email", prefill.renter_email);
    setVal("amount", prefill.amount_php);
    if (prefill.start_date) setStartDate(String(prefill.start_date));
    setVal("payment_instructions", prefill.payment_instructions);
    setVal("due_day", prefill.due_day);
    setPrefill(null);
  }, [prefill, frequency]);

  async function autoFill() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setAi({ error: "Choose a contract file first." });
      return;
    }
    setAi({ loading: true });
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/contract/extract", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.configured === false) {
        setAi({ error: "Auto-read isn't set up yet — fill the form manually." });
        return;
      }
      if (json.error || !json.fields) {
        setAi({ error: json.error ?? "Couldn't read that file." });
        return;
      }
      const fields = json.fields as Record<string, unknown>;
      const freq = fields.frequency;
      if (
        freq === "monthly" ||
        freq === "weekly" ||
        freq === "biweekly" ||
        freq === "quarterly"
      ) {
        setFrequency(freq);
      }
      setPrefill(fields);
      setAi({ msg: "Filled from your contract — please review everything below." });
    } catch {
      setAi({ error: "Something went wrong reading the file." });
    }
  }

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <fieldset className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <legend className="px-1 text-sm font-semibold text-emerald-800">
          ✨ Auto-fill from contract
        </legend>
        <p className="text-xs text-emerald-900/70">
          Upload the signed contract (PDF or photo). Tap ✨ Auto-fill to have AI
          read it and fill the details below (always review), and it&apos;s saved
          to your vault when you make the agreement.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            name="contract"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700"
          />
          <button
            type="button"
            onClick={autoFill}
            disabled={ai.loading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
          >
            {ai.loading && (
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              />
            )}
            {ai.loading ? "Reading…" : "✨ Auto-fill"}
          </button>
        </div>
        {ai.error && <p className="text-sm text-red-600">{ai.error}</p>}
        {ai.msg && <p className="text-sm text-emerald-700">{ai.msg}</p>}
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Unit & renter
        </legend>
        <div>
          <label htmlFor="asset_id" className={label}>
            Unit
          </label>
          <select id="asset_id" name="asset_id" required className={input}>
            <option value="">Select a unit…</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="renter_name" className={label}>
              Renter name
            </label>
            <input id="renter_name" name="renter_name" required className={input} />
          </div>
          <div>
            <label htmlFor="renter_phone" className={label}>
              Renter phone
            </label>
            <input
              id="renter_phone"
              name="renter_phone"
              placeholder="+639171234567"
              className={input}
            />
          </div>
        </div>
        <div>
          <label htmlFor="renter_email" className={label}>
            Renter email
          </label>
          <input
            id="renter_email"
            name="renter_email"
            type="email"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="lessor_phone" className={label}>
            Your mobile number{" "}
            <span className="text-slate-400">(for payment alerts)</span>
          </label>
          <input
            id="lessor_phone"
            name="lessor_phone"
            placeholder="+639171234567"
            className={input}
          />
          <p className="mt-1 text-xs text-slate-400">
            We&apos;ll text &amp; email you here when this tenant sends proof of
            payment.
          </p>
        </div>
        <div>
          <label htmlFor="lessor_id" className={label}>
            Upload your ID
          </label>
          <input
            id="lessor_id"
            name="lessor_id"
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-900"
          />
          <p className="mt-1 text-xs text-slate-400">
            A photo of a valid ID — your renter will see it inside the unit, and
            you&apos;ll see theirs, for a fair, transparent agreement.
          </p>
        </div>
        <div>
          <label htmlFor="renter_id" className={label}>
            Upload the renter&apos;s ID
          </label>
          <input
            id="renter_id"
            name="renter_id"
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-900"
          />
          <p className="mt-1 text-xs text-slate-400">
            A photo of your renter&apos;s valid ID (kept private — shown only to
            the two of you inside this unit).
          </p>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Rent & schedule
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="amount" className={label}>
              Amount (₱)
            </label>
            <input
              id="amount"
              name="amount"
              inputMode="decimal"
              required
              placeholder="1500"
              className={input}
            />
          </div>
          <div>
            <label htmlFor="frequency" className={label}>
              Frequency
            </label>
            <select
              id="frequency"
              name="frequency"
              value={frequency}
              onChange={(e) =>
                setFrequency(e.target.value as AgreementFrequency)
              }
              className={input}
            >
              {(
                Object.keys(FREQUENCY_LABELS) as AgreementFrequency[]
              ).map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="due_day" className={label}>
              {isWeekly ? "Due weekday" : "Due day of month"}
            </label>
            {isWeekly ? (
              <select id="due_day" name="due_day" className={input} defaultValue="1">
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="due_day"
                name="due_day"
                type="number"
                min={1}
                max={31}
                defaultValue={1}
                className={input}
              />
            )}
          </div>
        </div>
        <div>
          <label htmlFor="term" className={label}>
            Lease term
          </label>
          <select
            id="term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className={input}
          >
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">1 year (12 months)</option>
            <option value="24">2 years</option>
            <option value="custom">Custom end date</option>
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Pick a length and the end date + whole payment schedule fill in
            automatically.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="start_date" className={label}>
              Start date
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="end_date" className={label}>
              End date {autoEnd && <span className="text-slate-400">(auto)</span>}
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              readOnly={autoEnd}
              className={`${input} ${autoEnd ? "bg-slate-100 text-slate-500" : ""}`}
            />
          </div>
          <div>
            <label htmlFor="grace_days" className={label}>
              Grace days
            </label>
            <input
              id="grace_days"
              name="grace_days"
              type="number"
              min={0}
              max={60}
              defaultValue={0}
              className={input}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Payments
        </legend>
        <div className="flex flex-wrap gap-2">
          {ALL_PAYMENT_METHODS.map((m) => (
            <label
              key={m}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-500/20 has-[:checked]:text-emerald-100"
            >
              <input
                type="checkbox"
                name="payment_methods"
                value={m}
                defaultChecked={m === "gcash" || m === "cash"}
                className="accent-emerald-600"
              />
              {PAYMENT_METHOD_LABELS[m]}
            </label>
          ))}
        </div>
        <div>
          <label htmlFor="payment_instructions" className={label}>
            Payment instructions{" "}
          </label>
          <textarea
            id="payment_instructions"
            name="payment_instructions"
            rows={2}
            placeholder="GCash 0917 123 4567 (Juan D.)"
            className={input}
          />
        </div>
      </fieldset>

      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
      >
        {pending && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
          />
        )}
        {pending ? "Saving…" : "Make an agreement"}
      </button>
    </form>
  );
}
