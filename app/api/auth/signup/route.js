import crypto from "crypto";
import { NextResponse } from "next/server";
import { withDb } from "@/lib/db";
import { parseIdentifier, validateSurname, validateDob } from "@/lib/identifier";
import { issueCode } from "@/lib/codes";
import { demoCodesVisible } from "@/lib/sender";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const id = parseIdentifier(body.identifier);
  const surname = validateSurname(body.surname);
  const dob = validateDob(body.dob);
  const errors = {};
  if (id.error) errors.identifier = id.error;
  if (surname.error) errors.surname = surname.error;
  if (dob.error) errors.dob = dob.error;
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 400 });

  const created = await withDb((db) => {
    const exists = db.users.some((u) => u[id.type] === id.value);
    if (exists) return null;
    const user = {
      id: crypto.randomUUID(),
      [id.type]: id.value,
      surname: surname.value,
      dob: dob.value,
      createdAt: new Date().toISOString(),
      credentials: [],
      activeSession: null,
    };
    db.users.push(user);
    return user;
  });

  if (!created) {
    return NextResponse.json({ errors: { identifier: "An account with this email or phone already exists. Log in instead." } }, { status: 409 });
  }

  // Sending the first code also proves the person owns the email or phone.
  const sent = await issueCode(created, id.value);
  return NextResponse.json({ ok: true, identifier: id.value, demoCode: demoCodesVisible() ? sent.code : undefined });
}
