import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { readDb, withDb } from "@/lib/db";
import { parseIdentifier } from "@/lib/identifier";
import { rpConfig, takeChallenge, fromB64 } from "@/lib/webauthn";
import { startSession } from "@/lib/session";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const id = parseIdentifier(body.identifier);
  if (id.error) return NextResponse.json({ error: id.error }, { status: 400 });

  const db = await readDb();
  const user = db.users.find((u) => u[id.type] === id.value);
  const cred = user?.credentials?.find((c) => c.id === body.response?.id);
  if (!user || !cred) return NextResponse.json({ error: "This device isn't registered for that account." }, { status: 401 });

  const expectedChallenge = await takeChallenge(user.id, "login");
  if (!expectedChallenge) return NextResponse.json({ error: "That request expired. Try again." }, { status: 400 });

  const { rpID, origin } = rpConfig();
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: cred.id,
        publicKey: fromB64(cred.publicKey),
        counter: cred.counter,
        transports: cred.transports,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Biometric check failed. " + e.message }, { status: 401 });
  }
  if (!verification.verified) return NextResponse.json({ error: "Biometric check failed." }, { status: 401 });

  await withDb((d) => {
    const c = d.users.find((u) => u.id === user.id).credentials.find((x) => x.id === cred.id);
    c.counter = verification.authenticationInfo.newCounter;
  });
  await startSession(user.id, req.headers.get("user-agent") || "");
  return NextResponse.json({ ok: true });
}
