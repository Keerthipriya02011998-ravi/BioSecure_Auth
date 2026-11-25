import { NextResponse } from "next/server";
import { getSession, publicUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (s.status === "ok") return NextResponse.json({ status: "ok", user: publicUser(s.user) });
  if (s.status === "replaced") return NextResponse.json({ status: "replaced" }, { status: 401 });
  return NextResponse.json({ status: "none" }, { status: 401 });
}
