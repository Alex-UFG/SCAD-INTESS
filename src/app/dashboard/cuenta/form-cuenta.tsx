"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { actualizarNombre, cambiarPassword } from "@/app/actions/cuenta";
import type { ActionState } from "@/types/actions";
import { FormField, ActionMessageBanner, inputClass, submitButtonClass } from "@/components/ui/form-field";

export function FormNombre({ nombreActual }: { nombreActual: string }) {
  const t = useTranslations("cuenta");
  const [state, formAction, pending] = useActionState(actualizarNombre, {} as ActionState);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <ActionMessageBanner state={state} />
      <FormField label={t("nombre")} required error={state.errors?.nombre?.[0]}>
        <input type="text" name="nombre" defaultValue={nombreActual} minLength={2} maxLength={120} required className={inputClass} />
      </FormField>
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={submitButtonClass}>
          {pending ? t("guardando") : t("guardarNombre")}
        </button>
      </div>
    </form>
  );
}

export function FormPassword() {
  const t = useTranslations("cuenta");
  const [state, formAction, pending] = useActionState(cambiarPassword, {} as ActionState);

  return (
    <form action={formAction} className="mt-4 space-y-4" autoComplete="off">
      <ActionMessageBanner state={state} />
      <FormField label={t("passwordActual")} required error={state.errors?.actual?.[0]}>
        <input type="password" name="actual" autoComplete="current-password" required className={inputClass} />
      </FormField>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={t("passwordNueva")} required error={state.errors?.nueva?.[0]}>
          <input type="password" name="nueva" autoComplete="new-password" minLength={8} required className={inputClass} />
        </FormField>
        <FormField label={t("passwordConfirmacion")} required error={state.errors?.confirmacion?.[0]}>
          <input type="password" name="confirmacion" autoComplete="new-password" minLength={8} required className={inputClass} />
        </FormField>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("passwordReglas")}</p>
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={submitButtonClass}>
          {pending ? t("guardando") : t("guardarPassword")}
        </button>
      </div>
    </form>
  );
}
