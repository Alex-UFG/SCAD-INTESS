"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { actualizarNombreAction, cambiarPasswordAction } from "@/app/actions/cuenta";
import { FormField, inputClass, submitButtonClass } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/types/actions";

function useToastDeEstado(state: ActionState) {
  const toast = useToast();
  const ultimo = useRef<ActionState | null>(null);
  useEffect(() => {
    if (state === ultimo.current || !state.message) return;
    ultimo.current = state;
    if (state.success) toast.success(state.message);
    else if (!state.errors) toast.error(state.message);
  }, [state, toast]);
}

export function FormNombre({ nombreActual }: { nombreActual: string }) {
  const t = useTranslations("cuenta");
  const [state, formAction, isPending] = useActionState(
    actualizarNombreAction,
    {} as ActionState
  );
  useToastDeEstado(state);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <FormField label={t("nombre")} required error={state.errors?.nombre?.[0]}>
        <input
          type="text"
          name="nombre"
          defaultValue={nombreActual}
          maxLength={120}
          required
          autoComplete="name"
          className={inputClass}
        />
      </FormField>
      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className={submitButtonClass}>
          {isPending ? t("guardando") : t("guardarNombre")}
        </button>
      </div>
    </form>
  );
}

export function FormPassword({ debeCambiar }: { debeCambiar: boolean }) {
  const t = useTranslations("cuenta");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    cambiarPasswordAction,
    {} as ActionState
  );
  useToastDeEstado(state);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-4">
      {debeCambiar && (
        <p className="rounded-md border border-riesgo/30 bg-riesgo-bg px-3 py-2 text-sm text-riesgo dark:border-riesgo/40 dark:bg-riesgo/15">
          {t("passwordTemporal")}
        </p>
      )}
      <FormField label={t("passwordActual")} required error={state.errors?.actual?.[0]}>
        <input
          type="password"
          name="actual"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("passwordNueva")} required error={state.errors?.nueva?.[0]}>
          <input
            type="password"
            name="nueva"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className={inputClass}
          />
        </FormField>
        <FormField
          label={t("passwordConfirmar")}
          required
          error={state.errors?.confirmar?.[0]}
        >
          <input
            type="password"
            name="confirmar"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className={inputClass}
          />
        </FormField>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("passwordHint")}</p>
      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className={submitButtonClass}>
          {isPending ? t("guardando") : t("guardarPassword")}
        </button>
      </div>
    </form>
  );
}
