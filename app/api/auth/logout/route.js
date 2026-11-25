import { NextResponse } from "next/server";
import { getSession, endSession, clearCookie } from "@/lib/session";

export async function POST() {
  const s = await getSession();
  if (s.status === "ok") await endSession(s.user.id, s.user.activeSession.sid);
  else clearCookie();
  return NextResponse.json({ ok: true });
}
