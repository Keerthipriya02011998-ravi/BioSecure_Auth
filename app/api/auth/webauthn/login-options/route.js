import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { readDb } from "@/lib/db";
import { parseIdentifier } from "@/lib/identifier";
import { rpConfig, saveChallenge } from "@/lib/webauthn";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const id = parseIdentifier(body.identifier);
  if (id.error) return NextResponse.json({ error: id.error }, { status: 400 });

  const db = await readDb();
  const user = db.users.find((u) => u[id.type] === id.value);
  if (!user) return NextResponse.json({ error: "No account found. Sign up first." }, { status: 404 });
  if (!user.credentials?.length) {
    return NextResponse.json({ error: "Biometric login isn't set up for this account yet. Log in with a code, then turn it on from your dashboard." }, { status: 400 });
  }

  const { rpID } = rpConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: user.credentials.map((c) => ({ id: c.id, transports: c.transports })),
  });
  await saveChallenge(user.id, "login", options.challenge);
  return NextResponse.json(options);
}
