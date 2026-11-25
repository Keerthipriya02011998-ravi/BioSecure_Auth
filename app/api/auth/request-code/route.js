import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { parseIdentifier } from "@/lib/identifier";
import { issueCode } from "@/lib/codes";
import { demoCodesVisible } from "@/lib/sender";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const id = parseIdentifier(body.identifier);
  if (id.error) return NextResponse.json({ errors: { identifier: id.error } }, { status: 400 });

  const db = await readDb();
  const user = db.users.find((u) => u[id.type] === id.value);
  if (!user) {
    return NextResponse.json({ errors: { identifier: "No account found. Sign up first." } }, { status: 404 });
  }
  const sent = await issueCode(user, id.value);
  if (sent.error) return NextResponse.json({ errors: { identifier: sent.error } }, { status: 429 });
  return NextResponse.json({ ok: true, identifier: id.value, demoCode: demoCodesVisible() ? sent.code : undefined });
}
