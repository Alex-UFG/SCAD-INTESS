import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (!session) redirect("/auth");

  return (
    <div className="flex flex-1 bg-slate-50 dark:bg-slate-950">
      <Sidebar rol={session.user.rol} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
