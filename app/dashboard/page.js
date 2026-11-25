import { redirect } from "next/navigation";
import { getSession, publicUser } from "@/lib/session";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const s = await getSession();
  if (s.status === "replaced") redirect("/login?reason=replaced");
  if (s.status !== "ok") redirect("/login");
  return <Dashboard initial={publicUser(s.user)} />;
}
