"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { resetPasswordAction } from "@/app/actions/admin";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import type { ActionState } from "@/types/actions";

/**
 * Gap 3: el Admin genera una contrasena temporal y la ve una sola vez en un
 * modal para entregarla al usuario; el usuario la cambia desde Mi cuenta.
 */
export function ResetPasswordButton({ id, email }: { id: number; email: string }) {
  const t = useTranslations("usuarios.reset");
  const [confirmar, setConfirmar] = useState(false);
  const [state, formAction, pending] = useActionState(resetPasswordAction, {} as ActionState);
  const [mostrado, setMostrado] = useState<string | null>(null);

  const ejecutar = () => {
    const fd = new FormData();
    fd.set("id", String(id));
    startTransition(() => formAction(fd));
    setConfirmar(false);
  };

  // El mensaje de exito es la contrasena temporal; se muestra hasta que el Admin cierre
  const temporal = state.success && state.message && mostrado !== state.message ? state.message : null;
  const error = state.success === false && state.message ? t(`errors.${state.message}`) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmar(true)}
        disabled={pending}
        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {pending ? t("generando") : t("boton")}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <ConfirmDialog
        open={confirmar}
        title={t("titulo")}
        text={t("confirmar", { email })}
        confirmLabel={t("boton")}
        onConfirm={ejecutar}
        onClose={() => setConfirmar(false)}
        danger
      />

      <Modal title={t("titulo")} open={temporal !== null} onClose={() => setMostrado(state.message ?? null)}>
        <p className="text-sm text-gray-600 dark:text-gray-300">{t("entregar", { email })}</p>
        <p className="mt-4 select-all rounded-md bg-gray-100 px-4 py-3 text-center font-mono text-lg tracking-widest text-gray-900 dark:bg-gray-800 dark:text-gray-100">
          {temporal}
        </p>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t("unaVez")}</p>
      </Modal>
    </>
  );
}
