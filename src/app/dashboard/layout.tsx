import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { PerfilDocenteGuard } from "@/components/layout/perfil-docente-guard";
import { usuarioTieneDocente } from "@/app/actions/docentes";

const ROL_DOCENTE = 5;

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (!session) redirect("/auth");

  // Gap 1: aprobar un usuario no crea su perfil docente; hasta completarlo no opera
  const perfilPendiente =
    session.user.rol === ROL_DOCENTE && !(await usuarioTieneDocente(Number(session.user.id)));

  return (
    <div className="flex flex-1 bg-slate-50 dark:bg-slate-950">
      <Sidebar rol={session.user.rol} />
      <div className="min-w-0 flex-1">
        <PerfilDocenteGuard pendiente={perfilPendiente} />
        {children}
      </div>
    </div>
  );
}
