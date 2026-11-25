
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  startRegistration,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

function fmtDob(iso) {
  const [y, m, d] = iso.split("-").map(Number);

  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function Dashboard({ initial }) {
  const router = useRouter();
  const [user, setUser] = useState(initial);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [bioOk, setBioOk] = useState(false);

  useEffect(() => {
    setBioOk(browserSupportsWebAuthn());
  }, []);

  // Check periodically whether this device is still active.
  useEffect(() => {
    let stop = false;

    async function check() {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (stop) return;

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          return;
        }

        const data = await res.json().catch(() => ({}));

        router.replace(
          data.status === "replaced"
            ? "/login?reason=replaced"
            : "/login"
        );
        router.refresh();
      } catch (error) {
        console.error("[Session] Check failed:", error);
      }
    }

    const timer = setInterval(check, 4000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        check();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  async function enableBiometrics() {
    setBusy(true);
    setMsg({
      type: "info",
      text: "Starting passkey setup...",
    });

    try {
      console.log("[Biometric] Step 1: Requesting registration options");

      const optRes = await fetch(
        "/api/auth/webauthn/register-options",
        { method: "POST" }
      );

      const options = await optRes.json().catch(() => ({}));

      console.log("[Biometric] Step 2: Options response", {
        status: optRes.status,
        options,
      });

      if (!optRes.ok) {
        throw new Error(
          options.error || "Could not get registration options."
        );
      }

      console.log("[Biometric] Step 3: Opening passkey prompt");

      const credential = await startRegistration({
        optionsJSON: options,
      });

      console.log("[Biometric] Step 4: Passkey response received");

      const verifyRes = await fetch(
        "/api/auth/webauthn/register-verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credential),
        }
      );

      const verification = await verifyRes.json().catch(() => ({}));

      console.log("[Biometric] Step 5: Verification response", {
        status: verifyRes.status,
        verification,
      });

      if (!verifyRes.ok) {
        throw new Error(
          verification.error || "Passkey verification failed."
        );
      }

      setUser((previousUser) => ({
        ...previousUser,
        biometricsEnabled: true,
        biometricCount: (previousUser.biometricCount || 0) + 1,
      }));

      setMsg({
        type: "info",
        text: "Passkey registered successfully!",
      });
    } catch (error) {
      console.error("[Biometric] Setup failed:", error);

      let message = error.message || "Passkey setup failed.";

      if (error.name === "NotAllowedError") {
        message =
          "Passkey setup was cancelled or timed out. Check your device settings and try again.";
      } else if (error.name === "InvalidStateError") {
        message = "A passkey may already be registered on this device.";
      } else if (error.name === "NotSupportedError") {
        message =
          "This device or browser does not support the requested passkey setup.";
      } else if (error.name === "SecurityError") {
        message =
          "The browser blocked passkey setup. Check the address and WebAuthn configuration.";
      }

      setMsg({
        type: "warn",
        text: `${error.name || "Error"}: ${message}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("[Logout] Request failed:", error);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const contact = user.email || user.phone;

  return (
    <main className="dash">
      <header>
        <div className="brand-name">Secure Access</div>

        <button className="btn ghost" onClick={logout}>
          Log out
        </button>
      </header>

      <h1 className="hello">Welcome, {user.surname}.</h1>

      <p className="lede" style={{ marginBottom: 0 }}>
        You're signed in.
      </p>

      <div className="device">
        <span className="seat-dot" aria-hidden="true" />

        <div>
          <strong>This is your active device</strong>
          <span>
            {user.device}. Signing in anywhere else will end this session.
          </span>
        </div>
      </div>

      <dl className="dl">
        <div className="row">
          <dt>{user.email ? "Email" : "Phone"}</dt>
          <dd>{contact}</dd>
        </div>

        <div className="row">
          <dt>Surname</dt>
          <dd>{user.surname}</dd>
        </div>

        <div className="row">
          <dt>Date of birth</dt>
          <dd>{fmtDob(user.dob)}</dd>
        </div>

        <div className="row">
          <dt>Signed in at</dt>
          <dd>{new Date(user.signedInAt).toLocaleString()}</dd>
        </div>
      </dl>

      <section className="bio">
        <h3>Face ID or fingerprint</h3>

        <p>
          {user.biometricsEnabled
            ? `Turned on (${user.biometricCount} ${
                user.biometricCount === 1 ? "device" : "devices"
              }). You can add this device too.`
            : "Skip the code next time. Your device checks your face or fingerprint and we never see it."}
        </p>

        {msg.text && (
          <div
            className={`notice ${msg.type}`}
            role="status"
            aria-live="polite"
          >
            {msg.text}
          </div>
        )}

        {bioOk ? (
          <button
            className="btn secondary"
            onClick={enableBiometrics}
            disabled={busy}
          >
            {busy
              ? "Setting up passkey…"
              : user.biometricsEnabled
                ? "Add this device"
                : "Turn on biometric login"}
          </button>
        ) : (
          <div className="notice warn">
            This browser does not support WebAuthn passkeys.
          </div>
        )}
      </section>
    </main>
  );
}
