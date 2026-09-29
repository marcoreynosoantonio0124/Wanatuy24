"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  signIn,
  signUp,
  requestReset,
  type LoginMode,
  type LoginState,
} from "./actions";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [mode, setMode] = useState<LoginMode>("signin");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <Link href="/" className="mb-8 text-lg font-bold text-emerald-700">
        Due<span className="text-slate-400">Meet</span>
      </Link>

      {mode === "reset" ? (
        <ResetForm next={next} onBack={() => setMode("signin")} />
      ) : (
        <>
          {/* Sign in / Create account tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <TabButton
              active={mode === "signin"}
              onClick={() => setMode("signin")}
            >
              Sign in
            </TabButton>
            <TabButton
              active={mode === "signup"}
              onClick={() => setMode("signup")}
            >
              Create account
            </TabButton>
          </div>

          {mode === "signin" ? (
            <CredentialsForm
              key="signin"
              next={next}
              action={signIn}
              heading="Welcome back"
              subheading="Sign in with your email and password."
              submitLabel="Sign in"
              onForgot={() => setMode("reset")}
            />
          ) : (
            <CredentialsForm
              key="signup"
              next={next}
              action={signUp}
              heading="Create your account"
              subheading="Set a password — you'll use it every time you sign in."
              submitLabel="Create account"
            />
          )}
        </>
      )}

      <p className="mt-8 text-center text-xs text-slate-400">
        Renters: sign up with the same email your landlord used, para makita ang
        payment records mo. 🇵🇭
      </p>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function CredentialsForm({
  next,
  action,
  heading,
  subheading,
  submitLabel,
  onForgot,
}: {
  next: string;
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>;
  heading: string;
  subheading: string;
  submitLabel: string;
  onForgot?: () => void;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    action,
    {},
  );

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">{heading}</h1>
      <p className="mt-1 text-sm text-slate-500">{subheading}</p>

      {state.info && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {state.info}
        </div>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state.email}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            {onForgot && (
              <button
                type="button"
                onClick={onForgot}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={
              submitLabel === "Sign in" ? "current-password" : "new-password"
            }
            placeholder="At least 8 characters"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Please wait…" : submitLabel}
        </button>
      </form>
    </>
  );
}

function ResetForm({ next, onBack }: { next: string; onBack: () => void }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    requestReset,
    {},
  );

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Reset password</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter your email and we&apos;ll send a link to set a new password.
      </p>

      {state.info ? (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {state.info}
        </div>
      ) : (
        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label
              htmlFor="reset-email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="reset-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={state.email}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-4 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        ← Back to sign in
      </button>
    </>
  );
}
