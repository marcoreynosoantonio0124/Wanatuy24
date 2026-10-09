import Link from "next/link";

export const metadata = {
  title: "Terms of Service · DueMeet",
};

const UPDATED = "9 October 2026";

export default function TermsPage() {
  return (
    <main className="app-dark min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-5 py-12">
        <Link
          href="/login"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          ← Back
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Terms of Service</h1>
        <p className="mt-1 text-sm text-slate-400">Last updated: {UPDATED}</p>

        <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-200">
          Starting template — review with a lawyer before your public launch.
          Replace the bracketed placeholders.
        </div>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-300">
          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              1. Agreement to these terms
            </h2>
            <p>
              By creating an account or using DueMeet, you agree to these Terms of
              Service and to our{" "}
              <Link
                href="/privacy"
                className="text-emerald-400 hover:text-emerald-300"
              >
                Privacy Policy
              </Link>
              . If you do not agree, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              2. What DueMeet is
            </h2>
            <p>
              DueMeet is a tool that helps lessors and renters record rental
              agreements, track dues, send reminders, and keep documents in one
              place. DueMeet is a record-keeping and reminder tool. We are not a
              party to any rental agreement between you and another user, we do
              not provide legal advice, and we do not currently hold or process
              rent payments on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              3. Your account
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>You must provide true and accurate information.</li>
              <li>
                You are responsible for keeping your password safe and for
                activity under your account.
              </li>
              <li>You must be of legal age to enter a rental agreement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              4. Identity verification
            </h2>
            <p>
              A &quot;Verified&quot; badge means an uploaded government ID passed
              an automated check (clear photo, matching name, not expired). It is
              a helpful signal, not a guarantee of a person&apos;s identity or
              trustworthiness. Always use your own judgment before transacting.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              5. Acceptable use
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Do not upload fake, stolen, or someone else&apos;s ID.</li>
              <li>
                Do not use another person&apos;s data from DueMeet for anything
                other than the agreement you share with them.
              </li>
              <li>
                Do not use DueMeet to defraud, harass, or harm others, or for any
                unlawful purpose.
              </li>
            </ul>
            <p className="mt-2">
              We may suspend or remove accounts that break these rules.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              6. Your content
            </h2>
            <p>
              You keep ownership of the information and documents you upload. You
              grant us permission to store and process them only to provide the
              service as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              7. Service &quot;as is&quot;
            </h2>
            <p>
              DueMeet is provided on an &quot;as is&quot; basis. While we work hard
              to keep it reliable and accurate, we cannot guarantee it will always
              be error-free or available. To the extent allowed by law, we are not
              liable for losses arising from your use of the service or from
              dealings between you and another user.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              8. Changes &amp; contact
            </h2>
            <p>
              We may update these terms as DueMeet grows; we will post the new
              version here with an updated date. Questions? Contact us at [your
              email]. These terms are governed by the laws of the Republic of the
              Philippines.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-slate-400">
          See also our{" "}
          <Link
            href="/privacy"
            className="text-emerald-400 hover:text-emerald-300"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
