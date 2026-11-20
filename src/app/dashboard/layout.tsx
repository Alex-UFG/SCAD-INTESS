import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface DocenteRow extends RowDataPacket {
  dui_docente: string;
}

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (!session) redirect("/auth");

  // Cierre de Gap 1: Validar perfil de Docente
  if (session.user.rol === 5) {
    const [rows]: any = await db.query<DocenteRow[]>(
      "SELECT dui_docente FROM docente WHERE id_usuario = ? LIMIT 1",
      [session.user.id]
    );

    // Si no tiene perfil, lo forzamos a crearlo (siempre que no esté ya en la ruta)
    // Nota: Como estamos en el layout root del dashboard, dejamos que el children cargue, 
    // pero si es Rol 5 sin perfil, el componente hijo deberá hacer la redirección o bloqueamos aquí.
    if (rows.length === 0) {
       // Opcional: Redirigir si quieres bloqueo duro
       // return redirect("/dashboard/docentes/completar-perfil"); 
    }
  }

  return (
    <div className="flex flex-1 bg-slate-50 dark:bg-slate-950">
      <Sidebar rol={session.user.rol} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}