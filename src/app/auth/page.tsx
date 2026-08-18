import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthSwap } from "@/components/auth/auth-swap";

export default async function AuthPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return <AuthSwap />;
}
