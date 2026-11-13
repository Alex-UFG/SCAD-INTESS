import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPermisosDeRol } from "@/lib/permisos";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (!session) redirect("/auth");

  const permisos = await getPermisosDeRol(session.user.rol);

  return (
    <div className="flex flex-1 bg-slate-50 dark:bg-slate-950">
      <Sidebar rol={session.user.rol} permisos={[...permisos]} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
