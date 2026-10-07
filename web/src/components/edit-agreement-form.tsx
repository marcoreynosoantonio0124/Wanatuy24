"use client";

import { useActionState } from "react";
import {
  updateAgreement,
  type EditAgreementState,
} from "@/app/(app)/agreements/actions";
import { ALL_PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/format";
import type { AgreementRow, AgreementStatus, PaymentMethod } from "@/lib/database.types";

const label = "block text-sm font-medium text-slate-700";
const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

const STATUSES: { value: AgreementStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "ended", label: "Ended" },
  { value: "cancelled", label: "Cancelled" },
  { value: "draft", label: "Draft" },
];

export function EditAgreementForm({ agreement }: { agreement: AgreementRow }) {
  const [state, action, pending] = useActionState<EditAgreementState, FormData>(
    updateAgreement,
    {},
  );
  const methods = agreement.accepted_payment_methods ?? [];

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={agreement.id} />

      <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Renter & contacts
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="renter_name" className={label}>
              Renter name
            </label>
            <input
              id="renter_name"
              name="renter_name"
              required
              defaultValue={agreement.renter_name}
              className={input}
            />
          </div>
          <div>
            <label htmlFor="renter_phone" className={label}>
              Renter phone
            </label>
            <input
              id="renter_phone"
              name="renter_phone"
              defaultValue={agreement.renter_phone ?? ""}
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
            defaultValue={agreement.renter_email ?? ""}
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
            defaultValue={agreement.lessor_phone ?? ""}
            placeholder="+639171234567"
            className={input}
          />
          <p className="mt-1 text-xs text-slate-400">
            We&apos;ll text &amp; email you here when this tenant sends proof of
            payment.
          </p>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Payments
        </legend>
        <div className="flex flex-wrap gap-2">
          {ALL_PAYMENT_METHODS.map((m: PaymentMethod) => (
            <label
              key={m}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50"
            >
              <input
                type="checkbox"
                name="payment_methods"
                value={m}
                defaultChecked={methods.includes(m)}
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
            rows={3}
            defaultValue={agreement.payment_instructions ?? ""}
            placeholder="GCash 0995 305 3078 (Juan D.)"
            className={input}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">
          Status
        </legend>
        <select
          name="status"
          defaultValue={agreement.status}
          className={input}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400">
          The rent amount, schedule, and dates can&apos;t be changed here (they
          affect already-generated due dates).
        </p>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex items-center gap-3">
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
          {pending ? "Saving…" : "Save changes"}
        </button>
        <a
          href={`/agreements/${agreement.id}`}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 active:scale-95"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
