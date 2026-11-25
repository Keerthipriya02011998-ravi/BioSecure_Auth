import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { parseIdentifier } from "@/lib/identifier";
import { checkCode } from "@/lib/codes";
import { startSession } from "@/lib/session";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const id = parseIdentifier(body.identifier);
  if (id.error) return NextResponse.json({ errors: { identifier: id.error } }, { status: 400 });

  const db = await readDb();
  const user = db.users.find((u) => u[id.type] === id.value);
  if (!user) return NextResponse.json({ errors: { code: "Wrong code." } }, { status: 401 });

  const result = await checkCode(user.id, body.code);
  if (result.error) return NextResponse.json({ errors: { code: result.error } }, { status: 401 });

  await startSession(user.id, req.headers.get("user-agent") || "");
  return NextResponse.json({ ok: true });
}
