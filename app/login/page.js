import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  const s = await getSession();
  if (s.status === "ok") redirect("/dashboard");
  return <LoginForm reason={searchParams?.reason || ""} />;
}
