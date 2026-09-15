"use client";

import Link from "next/link";
import { useSyncExternalStore, useTransition } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { setLocaleAction } from "@/app/actions/locale";
import { setThemeAction } from "@/app/actions/theme";
import { locales, type Locale } from "@/i18n/config";
import { BrandMark } from "@/components/layout/brand-mark";
import { UserMenu } from "@/components/layout/user-menu";

const subscribeNoop = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

interface AppHeaderProps {
  locale: string;
  isAuthenticated: boolean;
  userName?: string | null;
  userEmail?: string | null;
}

export function AppHeader({
  locale,
  isAuthenticated,
  userName = null,
  userEmail = null,
}: AppHeaderProps) {
  const t = useTranslations("ui");
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const [, startTransition] = useTransition();

  const isDark = mounted && resolvedTheme === "dark";

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    // Persistencia cross-device: solo aplica si hay sesión activa.
    void setThemeAction(next);
  }

  function changeLocale(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
    });
  }

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="flex h-full w-full items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={isAuthenticated ? "/dashboard" : "/auth"}
          className="flex items-center gap-3"
        >
          <BrandMark className="h-9 w-9" />
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-intess-dark dark:text-slate-100">
              {t("appName")}
            </span>
            <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              {t("tagline")}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center rounded-full border border-slate-200 p-0.5 dark:border-slate-700"
            role="group"
            aria-label={t("language")}
          >
            {locales.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => changeLocale(l)}
                aria-pressed={l === locale}
                className={`rounded-full px-2.5 py-1 text-xs font-medium uppercase transition-colors ${
                  l === locale
                    ? "bg-intess text-white"
                    : "text-slate-500 hover:text-intess dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? t("themeLight") : t("themeDark")}
            title={t("theme")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-intess hover:text-intess dark:border-slate-700 dark:text-slate-300 dark:hover:border-intess-accent dark:hover:text-intess-accent"
          >
            {isDark ? (
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
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
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
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {isAuthenticated && <UserMenu name={userName} email={userEmail} />}
        </div>
      </div>
    </header>
  );
}
