"use client";
import { useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import CodeStep from "@/components/CodeStep";

export default function SignupPage() {
  const [form, setForm] = useState({ identifier: "", surname: "", dob: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null); // { identifier, demoCode }

  const today = new Date().toISOString().slice(0, 10);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErrors({});
    const res = await fetch("/api/auth/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setSent({ identifier: data.identifier, demoCode: data.demoCode });
    else setErrors(data.errors || { identifier: "Something went wrong. Try again." });
  }

  if (sent) return <Shell><CodeStep {...sent} onBack={() => setSent(null)} /></Shell>;

  return (
    <Shell>
      <h2>Create your account</h2>
      <p className="lede">Use your email or phone number. We'll send a code to confirm it.</p>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="identifier">Email or phone number</label>
          <input id="identifier" type="text" autoComplete="username" value={form.identifier} onChange={update("identifier")}
            aria-invalid={!!errors.identifier} aria-describedby="identifier-err" placeholder="you@example.com or +919876543210" />
          <div id="identifier-err" className="error" role="alert">{errors.identifier}</div>
        </div>
        <div className="field">
          <label htmlFor="surname">Surname</label>
          <input id="surname" type="text" autoComplete="family-name" value={form.surname} onChange={update("surname")}
            aria-invalid={!!errors.surname} aria-describedby="surname-err" />
          <div id="surname-err" className="error" role="alert">{errors.surname}</div>
        </div>
        <div className="field">
          <label htmlFor="dob">Date of birth</label>
          <input id="dob" type="date" autoComplete="bday" max={today} min="1900-01-01" value={form.dob} onChange={update("dob")}
            aria-invalid={!!errors.dob} aria-describedby="dob-err" />
          <div id="dob-err" className="error" role="alert">{errors.dob}</div>
        </div>
        <button className="btn" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      </form>
      <p className="below">Already have an account? <Link href="/login">Log in</Link></p>
    </Shell>
  );
}
