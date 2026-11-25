export default function Shell({ children }) {
  return (
    <main className="shell">
      <aside className="brand">
        <div className="brand-name">Secure Access</div>
        <div>
          <h1>One account. One device at a time.</h1>
          <p>Sign in with a 6-digit code or your fingerprint or face. Signing in somewhere new signs you out of the old place.</p>
          <div className="seat" aria-hidden="true">
            <span className="seat-ghost" />
            <span className="seat-dot" />
            <small>Active device</small>
          </div>
        </div>
        <div />
      </aside>
      <section className="panel">
        <div className="card">{children}</div>
      </section>
    </main>
  );
}
