import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getSession } from "@/lib/session";
import { rpConfig, RP_NAME, saveChallenge } from "@/lib/webauthn";

// Only a signed-in user can add a biometric to their own account.
export async function POST() {
  const s = await getSession();
  if (s.status !== "ok") return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { rpID } = rpConfig();
  const user = s.user;

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: user.email || user.phone,
    userDisplayName: user.surname,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: (user.credentials || []).map((c) => ({ id: c.id, transports: c.transports })),
    authenticatorSelection: {
      authenticatorAttachment: "platform", // Face ID, Touch ID, fingerprint, Windows Hello
      userVerification: "required",
      residentKey: "preferred",
    },
  });
  await saveChallenge(user.id, "register", options.challenge);
  return NextResponse.json(options);
}
