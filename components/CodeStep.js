"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CodeInput from "./CodeInput";

// Second step shared by sign-up and login: enter the 6-digit code.
export default function CodeStep({ identifier, demoCode: initialDemo, onBack }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState(initialDemo);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");

  async function verify(value = code) {
    if (busy) return;
    setBusy(true); setError(""); setInfo("");
    const res = await fetch("/api/auth/verify-code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, code: value }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { router.replace("/dashboard"); router.refresh(); return; }
    setError(data.errors?.code || data.errors?.identifier || "Something went wrong. Try again.");
    setCode(""); setBusy(false);
  }

  async function resend() {
    setError(""); setInfo("");
    const res = await fetch("/api/auth/request-code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setDemoCode(data.demoCode); setCode(""); setInfo("New code sent."); }
    else setError(data.errors?.identifier || "Couldn't send a new code.");
  }

  return (
    <div>
      <h2>Enter your code</h2>
      <p className="lede">We sent a 6-digit code to <strong>{identifier}</strong>. It works once and expires in 5 minutes.</p>

      {demoCode && (
        <div className="notice info" role="status">
          Demo mode: no email or SMS service is connected, so your code is <code>{demoCode}</code>
        </div>
      )}

      <CodeInput value={code} onChange={setCode} invalid={!!error} disabled={busy} onComplete={verify} />
      <div className="error" role="alert" style={{ minHeight: 24 }}>{error}</div>
      {info && <div className="below" role="status" style={{ marginTop: 0 }}>{info}</div>}

      <div style={{ marginTop: 16 }}>
        <button className="btn" onClick={() => verify()} disabled={busy || code.length !== 6}>
          {busy ? "Checking…" : "Log in"}
        </button>
      </div>
      <p className="below">
        Didn't get it? <button className="linkish" onClick={resend}>Send a new code</button>
        {" "}or <button className="linkish" onClick={onBack}>change the {identifier.includes("@") ? "email" : "number"}</button>.
      </p>
    </div>
  );
}
