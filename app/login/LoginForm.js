"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import Shell from "@/components/Shell";
import CodeStep from "@/components/CodeStep";

export default function LoginForm({ reason }) {
  const router = useRouter();
  const [tab, setTab] = useState("code");
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const [bioOk, setBioOk] = useState(true);

  useEffect(() => { setBioOk(browserSupportsWebAuthn()); }, []);

  async function sendCode(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/auth/request-code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setSent({ identifier: data.identifier, demoCode: data.demoCode });
    else setError(data.errors?.identifier || "Something went wrong. Try again.");
  }

  async function biometric(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const optRes = await fetch("/api/auth/webauthn/login-options", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const options = await optRes.json();
      if (!optRes.ok) throw new Error(options.error || "Couldn't start biometric login.");

      const response = await startAuthentication({ optionsJSON: options });

      const verRes = await fetch("/api/auth/webauthn/login-verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, response }),
      });
      const ver = await verRes.json();
      if (!verRes.ok) throw new Error(ver.error || "Biometric check failed.");
      router.replace("/dashboard"); router.refresh();
    } catch (err) {
      setError(err.name === "NotAllowedError" ? "Biometric check was cancelled. Try again or use a code." : err.message);
      setBusy(false);
    }
  }

  if (sent) return <Shell><CodeStep {...sent} onBack={() => setSent(null)} /></Shell>;

  return (
    <Shell>
      <h2>Log in</h2>
      <p className="lede">Choose how you want to prove it's you.</p>

      {reason === "replaced" && (
        <div className="notice warn" role="alert">
          You were signed out because this account was logged in on another device. Only one device can be active at a time.
        </div>
      )}

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "code"} onClick={() => { setTab("code"); setError(""); }}>6-digit code</button>
        <button role="tab" aria-selected={tab === "bio"} onClick={() => { setTab("bio"); setError(""); }}>Face ID or fingerprint</button>
      </div>

      <form onSubmit={tab === "code" ? sendCode : biometric} noValidate>
        <div className="field">
          <label htmlFor="identifier">Email or phone number</label>
          <input id="identifier" type="text" autoComplete="username webauthn" value={identifier}
            onChange={(e) => setIdentifier(e.target.value)} aria-invalid={!!error} aria-describedby="id-err"
            placeholder="you@example.com or +919876543210" />
          <div id="id-err" className="error" role="alert">{error}</div>
        </div>

        {tab === "code" ? (
          <button className="btn" disabled={busy}>{busy ? "Sending…" : "Send me a code"}</button>
        ) : bioOk ? (
          <>
            <button className="btn" disabled={busy}>{busy ? "Waiting for your device…" : "Use Face ID or fingerprint"}</button>
            <p className="below">Biometrics work after you turn them on from your dashboard once. They use your device's own lock, so your face or fingerprint is never sent to us.</p>
          </>
        ) : (
          <div className="notice warn">This browser doesn't support biometric login. Use a 6-digit code instead.</div>
        )}
      </form>
      <p className="below">New here? <Link href="/signup">Create an account</Link></p>
    </Shell>
  );
}
