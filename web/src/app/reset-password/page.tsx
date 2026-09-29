import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <Link href="/" className="mb-8 text-lg font-bold text-emerald-700">
        Due<span className="text-slate-400">Meet</span>
      </Link>

      {user ? (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">
            Set a new password
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose a new password for <strong>{user.email}</strong>.
          </p>
          <ResetPasswordForm />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">
            Link expired
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            This reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-center font-medium text-white transition hover:bg-emerald-700"
          >
            Back to sign in
          </Link>
        </>
      )}
    </main>
  );
}
