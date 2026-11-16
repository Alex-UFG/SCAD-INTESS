"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  resetPasswordUsuario,
  setEstadoUsuario,
  setRolUsuarioAction,
} from "@/app/actions/admin";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export interface UsuarioFila {
  id_usuario: number;
  email: string;
  id_rol: number;
  estado: "Activo" | "Inactivo" | "Bloqueado";
  nombre: string | null;
  ultimoAccesoTexto: string;
  ultimoAccesoMs: number | null;
}

export interface RolOpcion {
  id_rol: number;
  nombre: string;
}

interface Props {
  usuarios: UsuarioFila[];
  roles: RolOpcion[];
  selfId: string;
  puedeEditar: boolean;
  puedeBloquear: boolean;
}

const ESTADO_BADGE: Record<UsuarioFila["estado"], string> = {
  Activo: "bg-aprobado-bg text-aprobado dark:bg-aprobado/15 dark:text-aprobado",
  Inactivo: "bg-riesgo-bg text-riesgo dark:bg-riesgo/15 dark:text-riesgo",
  Bloqueado: "bg-reprobado-bg text-reprobado dark:bg-reprobado/15 dark:text-reprobado",
};

type Pendiente =
  | { tipo: "estado"; usuario: UsuarioFila }
  | { tipo: "reset"; usuario: UsuarioFila };

export function UsuariosTable({ usuarios, roles, selfId, puedeEditar, puedeBloquear }: Props) {
  const t = useTranslations("usuarios");
  const toast = useToast();
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [resetResultado, setResetResultado] = useState<{ email: string; password: string } | null>(null);

  async function confirmarPendiente() {
    if (!pendiente) return;
    if (pendiente.tipo === "estado") {
      const nuevo = pendiente.usuario.estado === "Bloqueado" ? "Activo" : "Bloqueado";
      const r = await setEstadoUsuario(pendiente.usuario.id_usuario, nuevo);
      if (r.success) toast.success(nuevo === "Bloqueado" ? t("bloqueado") : t("desbloqueado"));
      else toast.error(r.message);
      return;
    }
    const r = await resetPasswordUsuario(pendiente.usuario.id_usuario);
    if (r.success) setResetResultado({ email: r.email, password: r.password });
    else toast.error(r.message);
  }

  const columnas: Column<UsuarioFila>[] = [
    {
      key: "usuario",
      header: t("colUser"),
      sortable: true,
      sortValue: (u) => u.nombre ?? u.email,
      render: (u) => (
        <>
          <p className="font-medium text-slate-800 dark:text-slate-100">
            {u.nombre ?? "—"}
            {String(u.id_usuario) === selfId && (
              <span className="ml-2 rounded-full bg-intess-light px-2 py-0.5 text-[10px] font-semibold uppercase text-intess dark:bg-intess/20 dark:text-intess-accent">
                {t("you")}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
        </>
      ),
    },
    {
      key: "rol",
      header: t("colRol"),
      sortable: true,
      sortValue: (u) => roles.find((r) => r.id_rol === u.id_rol)?.nombre ?? "",
      render: (u) =>
        !puedeEditar || String(u.id_usuario) === selfId ? (
          <span className="text-slate-600 dark:text-slate-300">
            {roles.find((r) => r.id_rol === u.id_rol)?.nombre}
          </span>
        ) : (
          <form action={setRolUsuarioAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={u.id_usuario} />
            <select
              name="rol"
              defaultValue={u.id_rol}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              {roles.map((r) => (
                <option key={r.id_rol} value={r.id_rol}>
                  {r.nombre}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-full border border-intess px-3 py-1 text-xs font-medium text-intess transition-colors hover:bg-intess-light dark:border-intess-accent dark:text-intess-accent dark:hover:bg-intess-accent/10"
            >
              {t("saveRol")}
            </button>
          </form>
        ),
    },
    {
      key: "estado",
      header: t("colEstado"),
      sortable: true,
      render: (u) => (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[u.estado]}`}>
          {t(`estados.${u.estado}`)}
        </span>
      ),
    },
    {
      key: "acceso",
      header: t("colAcceso"),
      sortable: true,
      sortValue: (u) => u.ultimoAccesoMs,
      className: "whitespace-nowrap text-xs",
      render: (u) => <span className="text-slate-500 dark:text-slate-400">{u.ultimoAccesoTexto}</span>,
    },
    {
      key: "acciones",
      header: t("colAcciones"),
      align: "right",
      className: "whitespace-nowrap",
      render: (u) => {
        if (String(u.id_usuario) === selfId) return null;
        return (
          <div className="flex justify-end gap-2">
            {puedeEditar && (
              <button
                type="button"
                onClick={() => setPendiente({ tipo: "reset", usuario: u })}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-intess hover:text-intess dark:border-slate-600 dark:text-slate-300 dark:hover:border-intess-accent dark:hover:text-intess-accent"
              >
                {t("resetPassword")}
              </button>
            )}
            {puedeBloquear && (
              <button
                type="button"
                onClick={() => setPendiente({ tipo: "estado", usuario: u })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  u.estado === "Bloqueado"
                    ? "border border-aprobado text-aprobado hover:bg-aprobado-bg dark:hover:bg-aprobado/10"
                    : "border border-reprobado text-reprobado hover:bg-reprobado-bg dark:hover:bg-reprobado/10"
                }`}
              >
                {u.estado === "Bloqueado" ? t("unblock") : t("block")}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columnas}
        rows={usuarios}
        rowKey={(u) => u.id_usuario}
        pageSize={15}
        searchText={(u) => `${u.nombre ?? ""} ${u.email}`}
        emptyMessage={t("empty")}
      />

      <ConfirmModal
        open={pendiente !== null}
        onClose={() => setPendiente(null)}
        onConfirm={confirmarPendiente}
        danger={pendiente?.tipo === "reset" || pendiente?.usuario.estado !== "Bloqueado"}
        title={
          pendiente?.tipo === "reset"
            ? t("resetTitle")
            : pendiente?.usuario.estado === "Bloqueado"
              ? t("unblockTitle")
              : t("blockTitle")
        }
        message={
          pendiente
            ? t(
                pendiente.tipo === "reset"
                  ? "resetText"
                  : pendiente.usuario.estado === "Bloqueado"
                    ? "unblockText"
                    : "blockText",
                { email: pendiente.usuario.email }
              )
            : ""
        }
      />

      <Modal
        title={t("resetDoneTitle")}
        open={resetResultado !== null}
        onClose={() => setResetResultado(null)}
      >
        {resetResultado && (
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p>{t("resetDoneText", { email: resetResultado.email })}</p>
            <p className="select-all rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-lg tracking-wider text-intess-dark dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              {resetResultado.password}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("resetDoneHint")}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
