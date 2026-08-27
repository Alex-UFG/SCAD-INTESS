"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { loginAction, registerAction } from "@/app/actions/auth";

type Mode = "login" | "register";

const inputClass =
  "w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-intess focus:outline-none dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-intess-accent";

const labelClass =
  "block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400";

const primaryButtonClass =
  "w-full rounded-full bg-intess py-2.5 text-sm font-semibold text-white transition-colors hover:bg-intess/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-intess focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900";

const errorBannerClass =
  "rounded-md border border-reprobado/30 bg-reprobado-bg px-3 py-2 text-sm text-reprobado dark:border-reprobado/40 dark:bg-reprobado/15";

const successBannerClass =
  "rounded-md border border-aprobado/30 bg-aprobado-bg px-3 py-2 text-sm text-aprobado dark:border-aprobado/40 dark:bg-aprobado/15";

const fieldErrorClass = "mt-1 text-xs text-reprobado";

function PasswordToggle({
  visible,
  onToggle,
  showLabel,
  hideLabel,
}: {
  visible: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? hideLabel : showLabel}
      className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-intess dark:hover:text-intess-accent"
    >
      {visible ? (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

export function AuthSwap() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { setTheme } = useTheme();

  const [mode, setMode] = useState<Mode>("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, t("errors.emailRequired"))
          .pipe(z.email(t("errors.emailInvalid"))),
        password: z.string().min(1, t("errors.passwordRequired")),
        remember: z.boolean().optional(),
      }),
    [t]
  );

  const registerSchema = useMemo(
    () =>
      z
        .object({
          name: z.string().trim().min(1, t("errors.nameRequired")),
          email: z
            .string()
            .min(1, t("errors.emailRequired"))
            .pipe(z.email(t("errors.emailInvalid"))),
          password: z.string().min(8, t("errors.passwordMin")),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("errors.confirmMismatch"),
          path: ["confirmPassword"],
        }),
    [t]
  );

  type LoginValues = z.infer<typeof loginSchema>;
  type RegisterValues = z.infer<typeof registerSchema>;

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  function switchMode(next: Mode) {
    setAuthError(null);
    setNotice(null);
    loginForm.clearErrors();
    registerForm.clearErrors();
    setMode(next);
  }

  const onLogin = loginForm.handleSubmit(async (values) => {
    setAuthError(null);
    setNotice(null);
    const result = await loginAction(values);
    if (result.ok) {
      // Preferencia de tema guardada en BD: se aplica al entrar.
      if (result.theme) setTheme(result.theme);
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setAuthError(t(`errors.${result.error}`));
  });

  const onRegister = registerForm.handleSubmit(async (values) => {
    setAuthError(null);
    const result = await registerAction(values);
    if (result.ok) {
      registerForm.reset();
      setNotice(t("requestSent"));
      setMode("login");
      return;
    }
    setAuthError(t(`errors.${result.error}`));
  });

  const loginActive = mode === "login";

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-slate-50 px-4 py-6 md:py-10 dark:bg-slate-950">
      {/* Luces decorativas de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-intess/20 blur-3xl dark:bg-intess/30"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-intess-accent/20 blur-3xl dark:bg-intess-accent/25"
      />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/80">
        <div
          className={`flex w-[200%] transition-transform duration-500 ease-in-out ${
            loginActive ? "translate-x-0" : "max-md:translate-x-0 md:-translate-x-1/2"
          }`}
        >
          {/* ============ PANEL: LOGIN ============ */}
          <section
            className={`w-1/2 shrink-0 ${loginActive ? "flex" : "hidden md:flex"}`}
            aria-hidden={!loginActive}
            inert={!loginActive}
          >
            <div className="grid flex-1 md:grid-cols-2">
              {/* Formulario de login */}
              <div className="flex flex-col justify-center p-6 sm:p-8 md:p-12">
                <h1 className="text-2xl font-bold text-intess-dark dark:text-slate-100">
                  {t("loginTitle")}
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t("loginSubtitle")}
                </p>

                {loginActive && notice && (
                  <div role="status" className={`mt-5 ${successBannerClass}`}>
                    {notice}
                  </div>
                )}
                {loginActive && authError && (
                  <div role="alert" className={`mt-5 ${errorBannerClass}`}>
                    {authError}
                  </div>
                )}

                <form onSubmit={onLogin} noValidate className="mt-6 space-y-5">
                  <div>
                    <label htmlFor="login-email" className={labelClass}>
                      {t("email")}
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder={t("emailPlaceholder")}
                      className={inputClass}
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className={fieldErrorClass}>
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="login-password" className={labelClass}>
                      {t("password")}
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder={t("passwordPlaceholder")}
                        className={`${inputClass} pr-8`}
                        {...loginForm.register("password")}
                      />
                      <PasswordToggle
                        visible={showLoginPassword}
                        onToggle={() => setShowLoginPassword((v) => !v)}
                        showLabel={t("showPassword")}
                        hideLabel={t("hidePassword")}
                      />
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className={fieldErrorClass}>
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 text-sm">
                    <label className="flex cursor-pointer items-center gap-2 text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 accent-intess"
                        {...loginForm.register("remember")}
                      />
                      {t("remember")}
                    </label>
                    <a
                      href="#"
                      className="font-medium text-intess hover:underline dark:text-intess-accent"
                    >
                      {t("forgot")}
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={loginForm.formState.isSubmitting}
                    className={primaryButtonClass}
                  >
                    {loginForm.formState.isSubmitting
                      ? t("loginLoading")
                      : t("loginButton")}
                  </button>

                  <p className="text-center text-sm text-slate-500 dark:text-slate-400 md:hidden">
                    {t("toRegisterTitle")}{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("register")}
                      className="font-medium text-intess hover:underline dark:text-intess-accent"
                    >
                      {t("toRegisterCta")}
                    </button>
                  </p>
                </form>
              </div>

              {/* Panel promocional → solicitud de acceso */}
              <div className="hidden flex-col items-center justify-center gap-4 bg-linear-to-br from-intess-dark via-intess to-intess-accent p-8 text-center text-white md:flex md:p-12">
                <h2 className="text-2xl font-bold">{t("toRegisterTitle")}</h2>
                <p className="max-w-xs text-sm text-white/85">
                  {t("toRegisterText")}
                </p>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="mt-2 rounded-full border border-white/70 px-8 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10"
                >
                  {t("toRegisterCta")}
                </button>
              </div>
            </div>
          </section>

          {/* ============ PANEL: SOLICITUD DE ACCESO ============ */}
          <section
            className={`w-1/2 shrink-0 ${loginActive ? "hidden md:flex" : "flex"}`}
            aria-hidden={loginActive}
            inert={loginActive}
          >
            <div className="grid flex-1 md:grid-cols-2">
              {/* Panel promocional → login */}
              <div className="hidden flex-col items-center justify-center gap-4 bg-linear-to-br from-intess-accent via-intess to-intess-dark p-8 text-center text-white md:flex md:p-12">
                <h2 className="text-2xl font-bold">{t("toLoginTitle")}</h2>
                <p className="max-w-xs text-sm text-white/85">
                  {t("toLoginText")}
                </p>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="mt-2 rounded-full border border-white/70 px-8 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10"
                >
                  {t("toLoginCta")}
                </button>
              </div>

              {/* Formulario de solicitud */}
              <div className="flex flex-col justify-center p-6 sm:p-8 md:p-12">
                <h1 className="text-2xl font-bold text-intess-dark dark:text-slate-100">
                  {t("registerTitle")}
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t("registerSubtitle")}
                </p>

                {!loginActive && authError && (
                  <div role="alert" className={`mt-5 ${errorBannerClass}`}>
                    {authError}
                  </div>
                )}

                <form
                  onSubmit={onRegister}
                  noValidate
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label htmlFor="register-name" className={labelClass}>
                      {t("name")}
                    </label>
                    <input
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      placeholder={t("namePlaceholder")}
                      className={inputClass}
                      {...registerForm.register("name")}
                    />
                    {registerForm.formState.errors.name && (
                      <p className={fieldErrorClass}>
                        {registerForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="register-email" className={labelClass}>
                      {t("email")}
                    </label>
                    <input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      placeholder={t("emailPlaceholder")}
                      className={inputClass}
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className={fieldErrorClass}>
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="register-password" className={labelClass}>
                      {t("password")}
                    </label>
                    <div className="relative">
                      <input
                        id="register-password"
                        type={showRegisterPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder={t("passwordPlaceholder")}
                        className={`${inputClass} pr-8`}
                        {...registerForm.register("password")}
                      />
                      <PasswordToggle
                        visible={showRegisterPassword}
                        onToggle={() => setShowRegisterPassword((v) => !v)}
                        showLabel={t("showPassword")}
                        hideLabel={t("hidePassword")}
                      />
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className={fieldErrorClass}>
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="register-confirm" className={labelClass}>
                      {t("confirmPassword")}
                    </label>
                    <div className="relative">
                      <input
                        id="register-confirm"
                        type={showRegisterConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder={t("confirmPasswordPlaceholder")}
                        className={`${inputClass} pr-8`}
                        {...registerForm.register("confirmPassword")}
                      />
                      <PasswordToggle
                        visible={showRegisterConfirm}
                        onToggle={() => setShowRegisterConfirm((v) => !v)}
                        showLabel={t("showPassword")}
                        hideLabel={t("hidePassword")}
                      />
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className={fieldErrorClass}>
                        {registerForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={registerForm.formState.isSubmitting}
                    className={primaryButtonClass}
                  >
                    {registerForm.formState.isSubmitting
                      ? t("registerLoading")
                      : t("registerButton")}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="w-full text-center text-sm font-medium text-intess hover:underline dark:text-intess-accent"
                  >
                    {t("backToLogin")}
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
