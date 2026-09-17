"use client";

import { useActionState, useState } from "react";
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

  return (
    <form action={action} className="space-y-5">
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
              Renter phone <span className="text-slate-400">(optional)</span>
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
            Renter email <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="renter_email"
            name="renter_email"
            type="email"
            className={input}
          />
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
              className={input}
            />
          </div>
          <div>
            <label htmlFor="end_date" className={label}>
              End date <span className="text-slate-400">(optional)</span>
            </label>
            <input id="end_date" name="end_date" type="date" className={input} />
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
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50"
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
            <span className="text-slate-400">(optional)</span>
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
        className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create agreement"}
      </button>
    </form>
  );
}
