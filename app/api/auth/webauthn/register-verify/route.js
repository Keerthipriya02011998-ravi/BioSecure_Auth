import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getSession } from "@/lib/session";
import { withDb } from "@/lib/db";
import { rpConfig, takeChallenge, toB64 } from "@/lib/webauthn";

export async function POST(req) {
  const s = await getSession();
  if (s.status !== "ok") return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const user = s.user;
  const body = await req.json().catch(() => ({}));

  const expectedChallenge = await takeChallenge(user.id, "register");
  if (!expectedChallenge) return NextResponse.json({ error: "That request expired. Try again." }, { status: 400 });

  const { rpID, origin } = rpConfig();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (e) {
    return NextResponse.json({ error: "Couldn't verify this device. " + e.message }, { status: 400 });
  }
  if (!verification.verified) return NextResponse.json({ error: "Couldn't verify this device." }, { status: 400 });

  const { credential } = verification.registrationInfo;
  await withDb((db) => {
    const u = db.users.find((x) => x.id === user.id);
    u.credentials = u.credentials || [];
    // Only the public key is stored. The fingerprint or face never leaves the device.
    u.credentials.push({
      id: credential.id,
      publicKey: toB64(credential.publicKey),
      counter: credential.counter,
      transports: body.response?.transports || [],
      addedAt: new Date().toISOString(),
    });
  });
  return NextResponse.json({ ok: true });
}
