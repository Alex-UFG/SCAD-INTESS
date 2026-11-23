import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPermisosDeRol, ROL_DOCENTE } from "@/lib/permisos";
import { Sidebar } from "@/components/layout/sidebar";
import { PerfilDocenteGuard } from "@/components/layout/perfil-docente-guard";
import { usuarioTieneDocente } from "@/app/actions/docentes";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (!session) redirect("/auth");

  // Gap 1: aprobar un usuario no crea su perfil docente; hasta completarlo no opera
  const [permisos, perfilPendiente] = await Promise.all([
    getPermisosDeRol(session.user.rol),
    session.user.rol === ROL_DOCENTE
      ? usuarioTieneDocente(Number(session.user.id)).then((tiene) => !tiene)
      : false,
  ]);

  return (
    <div className="flex flex-1 bg-slate-50 dark:bg-slate-950">
      <Sidebar rol={session.user.rol} permisos={[...permisos]} />
      <div className="min-w-0 flex-1">
        <PerfilDocenteGuard pendiente={perfilPendiente} />
        {children}
      </div>
    </div>
  );
}
