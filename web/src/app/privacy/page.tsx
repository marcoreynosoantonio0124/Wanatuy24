import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · DueMeet",
};

const UPDATED = "9 October 2026";

export default function PrivacyPage() {
  return (
    <main className="app-dark min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-5 py-12">
        <Link
          href="/login"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          ← Back
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-1 text-sm text-slate-400">Last updated: {UPDATED}</p>

        <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-200">
          Starting template — review with a Philippine data-privacy professional
          before your public launch. Replace the bracketed placeholders.
        </div>

        <div className="prose-dm mt-8 space-y-6 text-sm leading-relaxed text-slate-300">
          <section>
            <h2 className="text-lg font-semibold text-slate-100">1. Who we are</h2>
            <p>
              DueMeet (&quot;DueMeet&quot;, &quot;we&quot;, &quot;us&quot;) is a
              rental-management platform operated by [Your registered business
              name], based in the Philippines. We respect your privacy and handle
              your personal data in line with the Philippine Data Privacy Act of
              2012 (RA 10173) and the rules of the National Privacy Commission
              (NPC).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              2. What we collect
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Account details: email address and password.</li>
              <li>
                Profile details: full name, suffix, home address, birthdate,
                civil status, occupation, work/company and address, spouse name,
                number of children, and mobile number.
              </li>
              <li>
                A photo of a valid ID (sensitive personal information), used to
                verify identity.
              </li>
              <li>
                Rental details you enter: properties, agreements, payment
                records, messages, and uploaded documents (e.g. contracts,
                payment proofs).
              </li>
              <li>
                Basic technical data needed to run the service (e.g. log and
                device information).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              3. Why we use it
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>To create and manage your account.</li>
              <li>
                To verify identity and show a transparent record between a lessor
                and a renter who have a signed agreement.
              </li>
              <li>To track dues and send payment reminders.</li>
              <li>To keep the service secure and prevent fraud or abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              4. Who can see your data
            </h2>
            <p>
              Your ID and personal details are kept private. They are shown only
              to the other party in an agreement you both signed — for example, a
              renter&apos;s ID is shared with their lessor for that agreement, and
              vice versa. We do not sell your personal data. We use trusted
              service providers (e.g. secure hosting, database, SMS and email
              delivery) solely to operate DueMeet, and they are bound to protect
              your data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              5. How long we keep it
            </h2>
            <p>
              We keep your data for as long as your account is active, and as
              needed to keep accurate rental records. You may ask us to delete
              your account and personal data; we will do so unless we are required
              to keep certain records by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              6. How we protect it
            </h2>
            <p>
              Data is stored on secured, access-controlled systems. ID photos and
              documents are kept in private storage and shared only through
              time-limited secure links. We apply reasonable organizational,
              physical, and technical measures to protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              7. Your rights
            </h2>
            <p>
              Under the Data Privacy Act you have the right to be informed, to
              access, to correct, to object, to erasure or blocking, to data
              portability, and to file a complaint with the NPC. To exercise any
              of these, contact us at [your email].
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">
              8. Contact &amp; Data Protection Officer
            </h2>
            <p>
              Questions or requests about your data? Contact our Data Protection
              Officer at [DPO name / email]. You may also contact the National
              Privacy Commission at privacy.gov.ph.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-100">9. Changes</h2>
            <p>
              We may update this policy as DueMeet grows. We will post the new
              version here with an updated date.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-slate-400">
          See also our{" "}
          <Link href="/terms" className="text-emerald-400 hover:text-emerald-300">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
