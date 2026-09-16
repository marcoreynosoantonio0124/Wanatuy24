export default function Home() {
  return (
    <div>
      <h1>DueMate</h1>
      <p className="muted">
        One shared timeline for every recurring obligation — rent, rentals, tasks, your own
        mortgage. Automated reminders before, on, and after each due date; the responsible party
        uploads proof; the other side confirms. Confirmation stops the reminders. No more daily
        &ldquo;did you pay / I&rsquo;ll pay tomorrow&rdquo;.
      </p>

      <h2>Surfaces</h2>
      <ul className="plain">
        <li className="card">
          <div className="title">
            <a href="/dashboard">Lessor dashboard →</a>
          </div>
          <div className="meta">Review queue, portfolio stats, and asset map.</div>
        </li>
        <li className="card">
          <div className="title">
            <a href="/me">Renter home →</a>
          </div>
          <div className="meta">All your agreements, next due, upload proof.</div>
        </li>
      </ul>

      <p className="small muted" style={{ marginTop: 24 }}>
        This is the DueMate MVP. The domain core (occurrence generation, state machine, reminder
        scheduling, authorization, notifications) is implemented and unit-tested. See the README
        for what&rsquo;s wired vs. stubbed and the remaining build-order steps.
      </p>
    </div>
  );
}
